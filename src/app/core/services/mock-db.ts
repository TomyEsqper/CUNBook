import { Injectable } from '@angular/core';
import { defer, delay, Observable, of } from 'rxjs';
import { createSeed, MockState, MockUser } from '../mocks/mock-data';
import { apiError } from '../models/api-error';
import { AppNotification, TipoNotificacion } from '../models/notification';
import { ReportSummary } from '../models/report';
import { MAX_RESERVAS_ACTIVAS, Reservation, ReservationRequest } from '../models/reservation';
import { OccupiedSlot, Space, SpaceFilter, SpaceRequest } from '../models/space';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  Rol,
  UpdateProfileRequest,
  User,
} from '../models/user';
import {
  combineDateTime,
  dayOfWeek,
  fromIsoDate,
  overlaps,
  timeToMinutes,
  toApiTime,
} from '../utils/date-utils';
import { filterSpaces } from '../utils/space-filter';

const STORAGE_KEY = 'cunbook-mock-db-v3';
const MOCK_LATENCY_MS = 300;

/**
 * Backend simulado en el navegador (localStorage). Replica las reglas y los mensajes
 * de error documentados para la API ASP.NET, para poder desarrollar el front sin servidor.
 */
@Injectable({
  providedIn: 'root',
})
export class MockDb {
  private state: MockState = this.load();

  run<T>(fn: () => T): Observable<T> {
    return defer(() => {
      const result = fn();
      this.save();
      return of(result === undefined ? result : structuredClone(result));
    }).pipe(delay(MOCK_LATENCY_MS));
  }

  reset(): void {
    this.state = createSeed();
    this.save();
  }

  // ---------- Auth / usuarios ----------

  login(req: LoginRequest): AuthResponse {
    const user = this.state.users.find((u) => u.email.toLowerCase() === req.email.trim().toLowerCase());
    if (!user || user.password !== req.password) {
      throw apiError(401, 'Correo o contraseña incorrectos.');
    }
    return { token: `mock-token.${user.id}`, user: this.publicUser(user) };
  }

  register(req: RegisterRequest): AuthResponse {
    const email = req.email.trim().toLowerCase();
    if (this.state.users.some((u) => u.email.toLowerCase() === email)) {
      throw apiError(400, 'Ya existe un usuario registrado con ese correo.');
    }
    if (req.rol !== 'Estudiante' && req.rol !== 'Docente') {
      throw apiError(400, 'Solo puedes registrarte como estudiante o docente.');
    }
    const user: MockUser = {
      id: this.state.seq.user++,
      nombre: req.nombre.trim(),
      email,
      password: req.password,
      rol: req.rol,
      telefono: req.telefono,
      facultad: req.facultad,
      fechaRegistro: new Date().toISOString(),
    };
    this.state.users.push(user);
    return { token: `mock-token.${user.id}`, user: this.publicUser(user) };
  }

  forgotPassword(_email: string): void {}

  userIdFromToken(token: string | null): number {
    const id = Number(token?.split('.')[1]);
    if (!id || !this.state.users.some((u) => u.id === id)) {
      throw apiError(401, 'El usuario autenticado no existe.');
    }
    return id;
  }

  getUser(id: number): User {
    return this.publicUser(this.findUser(id));
  }

  updateProfile(id: number, req: UpdateProfileRequest): User {
    const user = this.findUser(id);
    Object.assign(user, req);
    return this.publicUser(user);
  }

  listUsers(): User[] {
    return this.state.users.map((u) => this.publicUser(u));
  }

  updateRole(id: number, rol: Rol): User {
    const user = this.findUser(id);
    user.rol = rol;
    return this.publicUser(user);
  }

  // ---------- Espacios ----------

  listSpaces(filter: SpaceFilter = {}): Space[] {
    return filterSpaces(this.state.spaces, filter);
  }

  getSpace(id: number): Space {
    const space = this.findSpace(id);
    return { ...space, horarios: this.state.horarios.filter((h) => h.spaceId === id) };
  }

  createSpace(req: SpaceRequest): Space {
    this.validateSpace(req);
    const { horarios, ...data } = req;
    const space: Space = { ...data, id: this.state.seq.space++ };
    this.state.spaces.push(space);
    this.replaceHorarios(space.id, horarios);
    return this.getSpace(space.id);
  }

  updateSpace(id: number, req: SpaceRequest): Space {
    this.validateSpace(req);
    const space = this.findSpace(id);
    const { horarios, ...data } = req;
    Object.assign(space, data);
    this.replaceHorarios(id, horarios);
    return this.getSpace(id);
  }

  deactivateSpace(id: number): void {
    this.findSpace(id).disponible = false;
  }

  getOccupied(spaceId: number, desde: string, hasta: string): OccupiedSlot[] {
    this.findSpace(spaceId);
    return this.state.reservations
      .filter((r) => r.spaceId === spaceId && r.estado !== 'Cancelada' && r.fecha >= desde && r.fecha <= hasta)
      .map((r) => ({ reservationId: r.id, fecha: r.fecha, horaInicio: r.horaInicio, horaFin: r.horaFin }));
  }

  // ---------- Reservas ----------

  listMyReservations(userId: number): Reservation[] {
    this.refreshStates();
    return this.state.reservations
      .filter((r) => r.userId === userId)
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.horaInicio.localeCompare(a.horaInicio))
      .map((r) => this.withDetails(r));
  }

  listAllReservations(): Reservation[] {
    this.refreshStates();
    return [...this.state.reservations]
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.horaInicio.localeCompare(a.horaInicio))
      .map((r) => this.withDetails(r));
  }

  getReservation(userId: number, id: number): Reservation {
    this.refreshStates();
    const reservation = this.findReservation(id);
    if (reservation.userId !== userId && !this.isAdmin(userId)) {
      throw apiError(404, 'No se encontró la reserva.');
    }
    return this.withDetails(reservation);
  }

  createReservation(userId: number, req: ReservationRequest): Reservation {
    const data = this.normalize(req);
    this.validateReservation(data);
    const activas = this.state.reservations.filter(
      (r) => r.userId === userId && r.estado === 'Activa',
    ).length;
    if (activas >= MAX_RESERVAS_ACTIVAS) {
      throw apiError(400, `Ya tienes ${MAX_RESERVAS_ACTIVAS} reservas activas, que es el máximo permitido.`);
    }
    const reservation: Reservation = {
      id: this.state.seq.reservation++,
      userId,
      ...data,
      estado: 'Activa',
      fechaCreacion: new Date().toISOString(),
    };
    this.state.reservations.push(reservation);
    this.notify(userId, 'Confirmacion', `Reserva #${reservation.id} confirmada: ${this.describe(reservation)}.`);
    return this.withDetails(reservation);
  }

  updateReservation(userId: number, id: number, req: ReservationRequest): Reservation {
    this.refreshStates();
    const reservation = this.ownedReservation(userId, id);
    if (reservation.estado !== 'Activa') {
      throw apiError(400, 'Solo se pueden modificar reservas activas.');
    }
    this.assertBeforeLimit(reservation);
    const data = this.normalize(req);
    this.validateReservation(data, id);
    Object.assign(reservation, data);
    this.notify(userId, 'Confirmacion', `Reserva #${id} modificada: ${this.describe(reservation)}.`);
    return this.withDetails(reservation);
  }

  cancelReservation(userId: number, id: number): void {
    this.refreshStates();
    const admin = this.isAdmin(userId);
    const reservation = admin ? this.findReservation(id) : this.ownedReservation(userId, id);
    if (reservation.estado === 'Cancelada') {
      throw apiError(400, 'La reserva ya está cancelada.');
    }
    if (reservation.estado !== 'Activa') {
      throw apiError(400, 'Solo se pueden cancelar reservas activas.');
    }
    if (!admin) {
      this.assertBeforeLimit(reservation);
    }
    reservation.estado = 'Cancelada';
    this.notify(
      reservation.userId,
      'Cancelacion',
      reservation.userId === userId
        ? `Reserva #${id} cancelada: ${this.describe(reservation)}.`
        : `Tu reserva #${id} fue cancelada por la administración: ${this.describe(reservation)}.`,
    );
  }

  // ---------- Notificaciones ----------

  listNotifications(userId: number): AppNotification[] {
    return this.state.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.id - a.id);
  }

  markNotificationRead(userId: number, id: number): void {
    const notification = this.state.notifications.find((n) => n.id === id && n.userId === userId);
    if (!notification) {
      throw apiError(404, 'No se encontró la notificación.');
    }
    notification.leida = true;
  }

  // ---------- Reportes ----------

  report(): ReportSummary {
    this.refreshStates();
    const all = this.state.reservations;
    const vigentes = all.filter((r) => r.estado !== 'Cancelada');
    const hours = (r: Reservation) => (timeToMinutes(r.horaFin) - timeToMinutes(r.horaInicio)) / 60;
    // Horas de funcionamiento de un espacio en una semana, como base de la tasa de ocupacion.
    const weeklyHours = (spaceId: number) =>
      this.state.horarios
        .filter((h) => h.spaceId === spaceId && h.estaDisponible)
        .reduce((sum, h) => sum + (timeToMinutes(h.horaFin) - timeToMinutes(h.horaInicio)) / 60, 0);

    const espacios = this.state.spaces
      .map((s) => {
        const own = vigentes.filter((r) => r.spaceId === s.id);
        const horasReservadas = own.reduce((sum, r) => sum + hours(r), 0);
        const base = weeklyHours(s.id) * 2;
        return {
          spaceId: s.id,
          nombre: s.nombre,
          tipo: s.tipo,
          totalReservas: own.length,
          horasReservadas,
          ocupacion: base ? Math.min(100, Math.round((horasReservadas / base) * 100)) : 0,
        };
      })
      .sort((a, b) => b.totalReservas - a.totalReservas);

    const demand = new Map<string, number>();
    for (const r of vigentes) {
      for (let t = timeToMinutes(r.horaInicio); t < timeToMinutes(r.horaFin); t += 60) {
        const hora = `${String(Math.floor(t / 60)).padStart(2, '0')}:00`;
        demand.set(hora, (demand.get(hora) ?? 0) + 1);
      }
    }
    const demandaPorHora = [...demand.entries()]
      .map(([hora, total]) => ({ hora, total }))
      .sort((a, b) => a.hora.localeCompare(b.hora));

    return {
      totalReservas: all.length,
      reservasActivas: all.filter((r) => r.estado === 'Activa').length,
      reservasCanceladas: all.filter((r) => r.estado === 'Cancelada').length,
      totalUsuarios: this.state.users.length,
      totalEspacios: this.state.spaces.filter((s) => s.disponible).length,
      ocupacionPromedio: espacios.length
        ? Math.round(espacios.reduce((sum, e) => sum + e.ocupacion, 0) / espacios.length)
        : 0,
      espacios,
      demandaPorHora,
    };
  }

  // ---------- Internos ----------

  private validateReservation(req: ReservationRequest, ignoreId?: number): void {
    if (!req.spaceId) {
      throw apiError(400, 'El espacio es obligatorio.');
    }
    if (!req.fecha) {
      throw apiError(400, 'La fecha de la reserva es obligatoria.');
    }
    if (timeToMinutes(req.horaFin) <= timeToMinutes(req.horaInicio)) {
      throw apiError(400, 'La hora de fin debe ser mayor que la hora de inicio.');
    }
    if (combineDateTime(req.fecha, req.horaInicio) <= new Date()) {
      throw apiError(400, 'No se puede reservar una fecha u hora que ya pasó.');
    }
    const space = this.state.spaces.find((s) => s.id === req.spaceId);
    if (!space) {
      throw apiError(400, 'El espacio no existe.');
    }
    if (!space.disponible) {
      throw apiError(400, 'El espacio no está disponible para reservas.');
    }
    const dia = dayOfWeek(fromIsoDate(req.fecha));
    const opera = this.state.horarios.some(
      (h) =>
        h.spaceId === space.id &&
        h.diaSemana === dia &&
        h.estaDisponible &&
        timeToMinutes(h.horaInicio) <= timeToMinutes(req.horaInicio) &&
        timeToMinutes(h.horaFin) >= timeToMinutes(req.horaFin),
    );
    if (!opera) {
      throw apiError(400, 'El espacio no opera en la franja horaria solicitada.');
    }
    const ocupado = this.state.reservations.some(
      (r) =>
        r.id !== ignoreId &&
        r.spaceId === space.id &&
        r.fecha === req.fecha &&
        r.estado === 'Activa' &&
        overlaps(r.horaInicio, r.horaFin, req.horaInicio, req.horaFin),
    );
    if (ocupado) {
      throw apiError(400, 'El espacio ya está ocupado en esa franja horaria.');
    }
  }

  private validateSpace(req: SpaceRequest): void {
    if (!req.nombre?.trim()) {
      throw apiError(400, 'El nombre del espacio es obligatorio.');
    }
    if (!req.capacidad || req.capacidad <= 0) {
      throw apiError(400, 'La capacidad debe ser mayor que cero.');
    }
    for (const h of req.horarios) {
      if (timeToMinutes(h.horaFin) <= timeToMinutes(h.horaInicio)) {
        throw apiError(400, `El horario del ${h.diaSemana} tiene la hora de fin antes de la de inicio.`);
      }
    }
  }

  private assertBeforeLimit(reservation: Reservation): void {
    const limit = combineDateTime(reservation.fecha, reservation.horaInicio).getTime() - 60 * 60 * 1000;
    if (Date.now() > limit) {
      throw apiError(400, 'Solo puedes modificar o cancelar una reserva hasta una hora antes de su inicio.');
    }
  }

  private refreshStates(): void {
    const now = new Date();
    for (const r of this.state.reservations) {
      if (r.estado === 'Activa' && combineDateTime(r.fecha, r.horaFin) < now) {
        r.estado = 'Completada';
      }
    }
  }

  private replaceHorarios(spaceId: number, horarios: SpaceRequest['horarios']): void {
    this.state.horarios = this.state.horarios.filter((h) => h.spaceId !== spaceId);
    for (const h of horarios) {
      this.state.horarios.push({
        ...h,
        id: this.state.seq.horario++,
        spaceId,
        horaInicio: toApiTime(h.horaInicio),
        horaFin: toApiTime(h.horaFin),
      });
    }
  }

  private normalize(req: ReservationRequest): ReservationRequest {
    return {
      spaceId: req.spaceId,
      fecha: req.fecha,
      horaInicio: toApiTime(req.horaInicio ?? ''),
      horaFin: toApiTime(req.horaFin ?? ''),
    };
  }

  private notify(userId: number, tipo: TipoNotificacion, mensaje: string): void {
    this.state.notifications.push({
      id: this.state.seq.notification++,
      userId,
      tipo,
      mensaje,
      fechaEnvio: new Date().toISOString(),
      leida: false,
    });
  }

  private describe(r: Reservation): string {
    const space = this.state.spaces.find((s) => s.id === r.spaceId)?.nombre ?? `espacio #${r.spaceId}`;
    return `${space}, ${r.fecha} de ${r.horaInicio.slice(0, 5)} a ${r.horaFin.slice(0, 5)}`;
  }

  private withDetails(r: Reservation): Reservation {
    const space = this.state.spaces.find((s) => s.id === r.spaceId);
    const user = this.state.users.find((u) => u.id === r.userId);
    return {
      ...r,
      space: space && { id: space.id, nombre: space.nombre, ubicacion: space.ubicacion, tipo: space.tipo },
      user: user && { id: user.id, nombre: user.nombre, email: user.email },
    };
  }

  private ownedReservation(userId: number, id: number): Reservation {
    const reservation = this.findReservation(id);
    if (reservation.userId !== userId) {
      throw apiError(404, 'No se encontró la reserva.');
    }
    return reservation;
  }

  private findReservation(id: number): Reservation {
    if (!id || id <= 0) {
      throw apiError(400, 'El identificador de la reserva no es válido.');
    }
    const reservation = this.state.reservations.find((r) => r.id === id);
    if (!reservation) {
      throw apiError(404, 'No se encontró la reserva.');
    }
    return reservation;
  }

  private findSpace(id: number): Space {
    const space = this.state.spaces.find((s) => s.id === id);
    if (!space) {
      throw apiError(404, 'El espacio no existe.');
    }
    return space;
  }

  private findUser(id: number): MockUser {
    const user = this.state.users.find((u) => u.id === id);
    if (!user) {
      throw apiError(404, 'El usuario no existe.');
    }
    return user;
  }

  private isAdmin(userId: number): boolean {
    const rol = this.state.users.find((u) => u.id === userId)?.rol;
    return rol === 'Admin';
  }

  private publicUser({ password: _password, ...user }: MockUser): User {
    return user;
  }

  private load(): MockState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw) as MockState;
      }
    } catch {
      // Datos corruptos: se regenera la semilla.
    }
    return createSeed();
  }

  private save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }
}
