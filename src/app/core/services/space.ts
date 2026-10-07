import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSpace, ApiSpaceHorario, toApiHorario, toApiSpace, toSpace } from '../api/backend';
import { OccupiedSlot, Space, SpaceFilter, SpaceRequest } from '../models/space';
import { filterSpaces } from '../utils/space-filter';
import { MockDb } from './mock-db';
import { ReservationService } from './reservation';

function allOf<T>(requests: Observable<T>[]): Observable<T[]> {
  return requests.length ? forkJoin(requests) : of([]);
}

@Injectable({
  providedIn: 'root',
})
export class SpaceService {
  private readonly http = inject(HttpClient);
  private readonly mock = inject(MockDb);
  private readonly reservations = inject(ReservationService);
  private readonly url = `${environment.apiUrl}/spaces`;
  private readonly horariosUrl = `${environment.apiUrl}/space-horarios`;

  /** La API devuelve todos los espacios; busqueda y filtros se aplican aqui. */
  list(filter: SpaceFilter = {}): Observable<Space[]> {
    if (environment.useMocks) {
      return this.mock.run(() => this.mock.listSpaces(filter));
    }
    return this.http.get<ApiSpace[]>(this.url).pipe(map((list) => filterSpaces(list.map(toSpace), filter)));
  }

  get(id: number): Observable<Space> {
    return environment.useMocks
      ? this.mock.run(() => this.mock.getSpace(id))
      : this.http.get<ApiSpace>(`${this.url}/${id}`).pipe(map(toSpace));
  }

  /**
   * Franjas ocupadas del espacio entre dos fechas ("yyyy-MM-dd", ambas incluidas).
   * La API no publica la ocupacion de otros usuarios: solo se conocen las reservas propias,
   * y los cruces con reservas ajenas los rechaza el backend al guardar.
   */
  occupied(spaceId: number, desde: string, hasta: string): Observable<OccupiedSlot[]> {
    if (environment.useMocks) {
      return this.mock.run(() => this.mock.getOccupied(spaceId, desde, hasta));
    }
    return this.reservations.mine().pipe(
      map((list) =>
        list
          .filter((r) => r.spaceId === spaceId && r.estado === 'Activa' && r.fecha >= desde && r.fecha <= hasta)
          .map((r) => ({ reservationId: r.id, fecha: r.fecha, horaInicio: r.horaInicio, horaFin: r.horaFin })),
      ),
    );
  }

  create(req: SpaceRequest): Observable<Space> {
    if (environment.useMocks) {
      return this.mock.run(() => this.mock.createSpace(req));
    }
    return this.http.post<ApiSpace>(this.url, toApiSpace(req)).pipe(
      switchMap((created) => this.replaceHorarios(created, req)),
    );
  }

  update(id: number, req: SpaceRequest): Observable<Space> {
    if (environment.useMocks) {
      return this.mock.run(() => this.mock.updateSpace(id, req));
    }
    return this.http.put<ApiSpace>(`${this.url}/${id}`, toApiSpace(req)).pipe(
      switchMap((updated) => this.replaceHorarios(updated, req)),
    );
  }

  /** Desactivacion logica (disponible = false); el DELETE de la API borra el espacio. */
  deactivate(id: number): Observable<void> {
    if (environment.useMocks) {
      return this.mock.run(() => this.mock.deactivateSpace(id));
    }
    return this.http.get<ApiSpace>(`${this.url}/${id}`).pipe(
      switchMap(({ id: _id, horarios: _horarios, ...space }) =>
        this.http.put<ApiSpace>(`${this.url}/${id}`, { ...space, disponible: false }),
      ),
      map(() => undefined),
    );
  }

  /** Los horarios son un recurso aparte (/space-horarios): se reemplazan los anteriores por los del formulario. */
  private replaceHorarios(space: ApiSpace, req: SpaceRequest): Observable<Space> {
    const deletes = (space.horarios ?? []).map((h) => this.http.delete<ApiSpaceHorario>(`${this.horariosUrl}/${h.id}`));
    const creates = req.horarios.map((h) => this.http.post<ApiSpaceHorario>(this.horariosUrl, toApiHorario(space.id, h)));
    return allOf(deletes).pipe(
      switchMap(() => allOf(creates)),
      switchMap(() => this.get(space.id)),
    );
  }
}
