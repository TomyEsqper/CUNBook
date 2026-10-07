import { AppNotification } from '../models/notification';
import { Reservation } from '../models/reservation';
import { DIAS_SEMANA, Space, SpaceHorario } from '../models/space';
import { User } from '../models/user';
import { addDays, toIsoDate } from '../utils/date-utils';

export interface MockUser extends User {
  password: string;
}

export interface MockState {
  users: MockUser[];
  spaces: Space[];
  horarios: SpaceHorario[];
  reservations: Reservation[];
  notifications: AppNotification[];
  seq: { user: number; space: number; horario: number; reservation: number; notification: number };
}

export const DEMO_PASSWORD = 'demo123';

export interface DemoAccount {
  email: string;
  label: string;
  password: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { email: 'estudiante@cun.edu.co', label: 'Estudiante', password: DEMO_PASSWORD },
  { email: 'docente@cun.edu.co', label: 'Docente', password: DEMO_PASSWORD },
  { email: 'admin@cun.edu.co', label: 'Administrador', password: DEMO_PASSWORD },
];

function buildHorarios(spaces: Space[]): SpaceHorario[] {
  const horarios: SpaceHorario[] = [];
  let id = 1;
  for (const space of spaces) {
    for (const dia of DIAS_SEMANA) {
      if (dia === 'Domingo') {
        continue;
      }
      const sabado = dia === 'Sábado';
      horarios.push({
        id: id++,
        spaceId: space.id,
        diaSemana: dia,
        horaInicio: sabado ? '08:00:00' : '07:00:00',
        horaFin: sabado ? '13:00:00' : '21:00:00',
        estaDisponible: !(sabado && space.tipo === 'Auditorio'),
      });
    }
  }
  return horarios;
}

export function createSeed(): MockState {
  const now = new Date().toISOString();
  const today = new Date();
  const day = (offset: number) => toIsoDate(addDays(today, offset));

  const users: MockUser[] = [
    {
      id: 1,
      nombre: 'Laura Gómez',
      email: 'estudiante@cun.edu.co',
      password: DEMO_PASSWORD,
      rol: 'Estudiante',
      telefono: '3001234567',
      facultad: 'Ingeniería de Sistemas',
      fechaRegistro: now,
    },
    {
      id: 2,
      nombre: 'Carlos Ramírez',
      email: 'docente@cun.edu.co',
      password: DEMO_PASSWORD,
      rol: 'Docente',
      telefono: '3109876543',
      facultad: 'Ciencias Básicas',
      fechaRegistro: now,
    },
    {
      id: 3,
      nombre: 'Administrador CUN',
      email: 'admin@cun.edu.co',
      password: DEMO_PASSWORD,
      rol: 'Admin',
      telefono: '3205551234',
      facultad: 'Administración',
      fechaRegistro: now,
    },
    {
      id: 4,
      nombre: 'Marta Ruiz',
      email: 'espacios@cun.edu.co',
      password: DEMO_PASSWORD,
      rol: 'Admin',
      telefono: '3155550000',
      facultad: 'Bienestar Universitario',
      fechaRegistro: now,
    },
  ];

  const spaces: Space[] = [
    {
      id: 1,
      nombre: 'Mesa de Billar (Edificio D)',
      capacidad: 4,
      ubicacion: 'Edificio D, zona de bienestar',
      tipo: 'Espacio lúdico',
      descripcion: '2 puestos disponibles para juego recreativo',
      horarioFuncionamiento: 'Lun-Vie 7:00-21:00, Sáb 8:00-13:00',
      disponible: true,
    },
    {
      id: 2,
      nombre: 'Laboratorio de Química Avanzada',
      capacidad: 24,
      ubicacion: 'Bloque C, piso 1',
      tipo: 'Laboratorio',
      descripcion: 'Para prácticas académicas y experimentación',
      horarioFuncionamiento: 'Lun-Vie 7:00-21:00, Sáb 8:00-13:00',
      disponible: true,
    },
    {
      id: 3,
      nombre: 'Sala de Sistemas 201 (Piso 2)',
      capacidad: 20,
      ubicacion: 'Bloque B, piso 2',
      tipo: 'Laboratorio',
      descripcion: '20 computadoras de alto rendimiento',
      horarioFuncionamiento: 'Lun-Vie 7:00-21:00, Sáb 8:00-13:00',
      disponible: true,
    },
    {
      id: 4,
      nombre: 'Auditorio Principal',
      capacidad: 200,
      ubicacion: 'Edificio central',
      tipo: 'Auditorio',
      descripcion: 'Tarima, sonido profesional y proyección para eventos',
      horarioFuncionamiento: 'Lun-Vie 7:00-21:00',
      disponible: true,
    },
    {
      id: 5,
      nombre: 'Sala de Estudio 101',
      capacidad: 8,
      ubicacion: 'Bloque A, piso 1',
      tipo: 'Sala de estudio',
      descripcion: 'Sala silenciosa con mesa grupal y tablero',
      horarioFuncionamiento: 'Lun-Vie 7:00-21:00, Sáb 8:00-13:00',
      disponible: true,
    },
    {
      id: 6,
      nombre: 'Aula 204',
      capacidad: 35,
      ubicacion: 'Bloque B, piso 2',
      tipo: 'Aula',
      descripcion: 'Aula con video beam, sonido y pupitres móviles',
      horarioFuncionamiento: 'Lun-Vie 7:00-21:00, Sáb 8:00-13:00',
      disponible: true,
    },
    {
      id: 7,
      nombre: 'Laboratorio de Física',
      capacidad: 20,
      ubicacion: 'Bloque D, piso 1',
      tipo: 'Laboratorio',
      descripcion: 'Laboratorio en mantenimiento',
      horarioFuncionamiento: 'Lun-Vie 7:00-21:00',
      disponible: false,
    },
  ];

  const horarios = buildHorarios(spaces);

  const reservations: Reservation[] = [
    { id: 1, userId: 1, spaceId: 1, fecha: day(1), horaInicio: '10:00:00', horaFin: '12:00:00', estado: 'Activa', fechaCreacion: now },
    { id: 2, userId: 1, spaceId: 3, fecha: day(3), horaInicio: '14:00:00', horaFin: '16:00:00', estado: 'Activa', fechaCreacion: now },
    { id: 3, userId: 1, spaceId: 5, fecha: day(-5), horaInicio: '09:00:00', horaFin: '10:00:00', estado: 'Completada', fechaCreacion: now },
    { id: 4, userId: 1, spaceId: 2, fecha: day(-2), horaInicio: '15:00:00', horaFin: '17:00:00', estado: 'Cancelada', fechaCreacion: now },
    { id: 5, userId: 2, spaceId: 2, fecha: day(1), horaInicio: '08:00:00', horaFin: '10:00:00', estado: 'Activa', fechaCreacion: now },
    { id: 6, userId: 2, spaceId: 4, fecha: day(2), horaInicio: '16:00:00', horaFin: '18:00:00', estado: 'Activa', fechaCreacion: now },
    { id: 7, userId: 2, spaceId: 3, fecha: day(-3), horaInicio: '07:00:00', horaFin: '09:00:00', estado: 'Completada', fechaCreacion: now },
    { id: 8, userId: 2, spaceId: 1, fecha: day(-1), horaInicio: '10:00:00', horaFin: '11:00:00', estado: 'Completada', fechaCreacion: now },
    { id: 9, userId: 4, spaceId: 1, fecha: day(1), horaInicio: '14:00:00', horaFin: '15:30:00', estado: 'Activa', fechaCreacion: now },
    { id: 10, userId: 4, spaceId: 3, fecha: day(-4), horaInicio: '10:00:00', horaFin: '12:00:00', estado: 'Completada', fechaCreacion: now },
  ];

  const notifications: AppNotification[] = [];
  let notificationId = 1;
  for (const user of users) {
    notifications.push({
      id: notificationId++,
      userId: user.id,
      tipo: 'Aviso',
      mensaje: 'Mantenimiento de Sala de Sistemas el viernes',
      fechaEnvio: now,
      leida: false,
    });
  }
  notifications.push(
    {
      id: notificationId++,
      userId: 1,
      tipo: 'Recordatorio',
      mensaje: `Recordatorio: mañana tienes reservada la Mesa de Billar (Edificio D) de 10:00 a 12:00.`,
      fechaEnvio: now,
      leida: false,
    },
    {
      id: notificationId++,
      userId: 1,
      tipo: 'Confirmacion',
      mensaje: 'Reserva #2 confirmada: Sala de Sistemas 201 (Piso 2).',
      fechaEnvio: now,
      leida: true,
    },
    {
      id: notificationId++,
      userId: 1,
      tipo: 'Cancelacion',
      mensaje: 'Reserva #4 cancelada: Laboratorio de Química Avanzada.',
      fechaEnvio: now,
      leida: true,
    },
  );

  return {
    users,
    spaces,
    horarios,
    reservations,
    notifications,
    seq: {
      user: 5,
      space: 8,
      horario: horarios.length + 1,
      reservation: 11,
      notification: notificationId,
    },
  };
}
