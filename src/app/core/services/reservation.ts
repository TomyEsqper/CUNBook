import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiReservation, notAvailable, toReservation } from '../api/backend';
import { Reservation, ReservationRequest } from '../models/reservation';
import { toApiTime } from '../utils/date-utils';
import { AuthService } from './auth';
import { MockDb } from './mock-db';

@Injectable({
  providedIn: 'root',
})
export class ReservationService {
  private readonly http = inject(HttpClient);
  private readonly mock = inject(MockDb);
  private readonly auth = inject(AuthService);
  private readonly url = `${environment.apiUrl}/reservations`;

  /** GET /api/reservations: reservas del usuario autenticado, por fecha descendente. */
  mine(): Observable<Reservation[]> {
    return environment.useMocks
      ? this.mock.run(() => this.mock.listMyReservations(this.auth.currentUserId()))
      : this.http.get<ApiReservation[]>(this.url).pipe(map((list) => list.map(toReservation)));
  }

  get(id: number): Observable<Reservation> {
    return environment.useMocks
      ? this.mock.run(() => this.mock.getReservation(this.auth.currentUserId(), id))
      : this.http.get<ApiReservation>(`${this.url}/${id}`).pipe(map(toReservation));
  }

  create(req: ReservationRequest): Observable<Reservation> {
    const body = this.toBody(req);
    return environment.useMocks
      ? this.mock.run(() => this.mock.createReservation(this.auth.currentUserId(), body))
      : this.http.post<ApiReservation>(this.url, body).pipe(map(toReservation));
  }

  /** La API solo permite cambiar fecha y horas; el espacio de una reserva no se modifica. */
  update(id: number, req: ReservationRequest): Observable<Reservation> {
    const body = this.toBody(req);
    if (environment.useMocks) {
      return this.mock.run(() => this.mock.updateReservation(this.auth.currentUserId(), id, body));
    }
    const { fecha, horaInicio, horaFin } = body;
    return this.http
      .put<ApiReservation>(`${this.url}/${id}`, { fecha, horaInicio, horaFin })
      .pipe(map(toReservation));
  }

  /** DELETE /api/reservations/{id}: cambia el estado a "Cancelada". */
  cancel(id: number): Observable<void> {
    return environment.useMocks
      ? this.mock.run(() => this.mock.cancelReservation(this.auth.currentUserId(), id))
      : this.http.delete<ApiReservation>(`${this.url}/${id}`).pipe(map(() => undefined));
  }

  /** Todas las reservas del sistema (solo administradores). */
  all(): Observable<Reservation[]> {
    return environment.useMocks
      ? this.mock.run(() => this.mock.listAllReservations())
      : notAvailable('El listado de todas las reservas');
  }

  /** Cancelacion administrativa de cualquier reserva. */
  adminCancel(id: number): Observable<void> {
    return environment.useMocks
      ? this.mock.run(() => this.mock.cancelReservation(this.auth.currentUserId(), id))
      : notAvailable('La cancelación administrativa');
  }

  private toBody(req: ReservationRequest): ReservationRequest {
    return { ...req, horaInicio: toApiTime(req.horaInicio), horaFin: toApiTime(req.horaFin) };
  }
}
