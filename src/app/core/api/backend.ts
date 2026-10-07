import { Observable, throwError } from 'rxjs';
import { apiError } from '../models/api-error';
import { EstadoReserva, Reservation } from '../models/reservation';
import { DiaSemana, Space, SpaceHorario, SpaceRequest, TipoEspacio } from '../models/space';
import { Rol, User } from '../models/user';
import { combineDateTime } from '../utils/date-utils';

/**
 * Contrato de la API ASP.NET (ReservaEspacios.Api) y su traduccion a los modelos del front.
 * Los enums viajan como texto con el nombre exacto del enum de C#.
 */

export type ApiTipoEspacio = 'Aula' | 'Laboratorio' | 'SalaEstudio' | 'Ludico' | 'Auditorio';
export type ApiDiaSemana = 'Domingo' | 'Lunes' | 'Martes' | 'Miercoles' | 'Jueves' | 'Viernes' | 'Sabado';

export interface ApiAuthResponse {
  token: string;
  expira: string;
  userId: number;
  nombre: string;
  email: string;
  rol: Rol;
}

export interface ApiSpaceHorario {
  id: number;
  spaceId: number;
  nombreEspacio?: string;
  diaSemana: ApiDiaSemana;
  horaInicio: string;
  horaFin: string;
  estaDisponible: boolean;
}

export interface ApiSpace {
  id: number;
  nombre: string;
  capacidad: number;
  ubicacion: string;
  tipo: ApiTipoEspacio;
  descripcion: string;
  horarioFuncionamiento: string;
  disponible: boolean;
  horarios?: ApiSpaceHorario[];
}

export type ApiSpaceRequest = Omit<ApiSpace, 'id' | 'horarios'>;

export interface ApiSpaceHorarioRequest {
  spaceId: number;
  diaSemana: ApiDiaSemana;
  horaInicio: string;
  horaFin: string;
  estaDisponible: boolean;
}

export interface ApiReservation {
  id: number;
  userId: number;
  nombreUsuario: string;
  spaceId: number;
  nombreEspacio: string;
  ubicacionEspacio: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estado: EstadoReserva;
  fechaCreacion: string;
}

const TIPOS: Record<TipoEspacio, ApiTipoEspacio> = {
  Aula: 'Aula',
  Laboratorio: 'Laboratorio',
  'Sala de estudio': 'SalaEstudio',
  Auditorio: 'Auditorio',
  'Espacio lúdico': 'Ludico',
};

const DIAS: Record<DiaSemana, ApiDiaSemana> = {
  Lunes: 'Lunes',
  Martes: 'Martes',
  Miércoles: 'Miercoles',
  Jueves: 'Jueves',
  Viernes: 'Viernes',
  Sábado: 'Sabado',
  Domingo: 'Domingo',
};

function invert<K extends string, V extends string>(record: Record<K, V>): Record<V, K> {
  return Object.fromEntries(Object.entries(record).map(([k, v]) => [v, k])) as Record<V, K>;
}

const TIPOS_FRONT = invert(TIPOS);
const DIAS_FRONT = invert(DIAS);

export const toApiTipo = (tipo: TipoEspacio): ApiTipoEspacio => TIPOS[tipo];
export const toApiDia = (dia: DiaSemana): ApiDiaSemana => DIAS[dia];

export function toSpace(dto: ApiSpace): Space {
  return {
    ...dto,
    tipo: TIPOS_FRONT[dto.tipo] ?? 'Aula',
    horarios: dto.horarios?.map(toHorario),
  };
}

export function toHorario(dto: ApiSpaceHorario): SpaceHorario {
  return {
    id: dto.id,
    spaceId: dto.spaceId,
    diaSemana: DIAS_FRONT[dto.diaSemana],
    horaInicio: dto.horaInicio,
    horaFin: dto.horaFin,
    estaDisponible: dto.estaDisponible,
  };
}

export function toApiSpace({ horarios: _horarios, ...req }: SpaceRequest): ApiSpaceRequest {
  return { ...req, tipo: toApiTipo(req.tipo) };
}

export function toApiHorario(spaceId: number, h: SpaceRequest['horarios'][number]): ApiSpaceHorarioRequest {
  return { spaceId, diaSemana: toApiDia(h.diaSemana), horaInicio: h.horaInicio, horaFin: h.horaFin, estaDisponible: h.estaDisponible };
}

/** El backend no cierra las reservas vencidas: una "Activa" que ya termino se muestra como "Completada". */
export function toReservation(dto: ApiReservation): Reservation {
  const vencida = dto.estado === 'Activa' && combineDateTime(dto.fecha, dto.horaFin) < new Date();
  return {
    id: dto.id,
    userId: dto.userId,
    spaceId: dto.spaceId,
    fecha: dto.fecha,
    horaInicio: dto.horaInicio,
    horaFin: dto.horaFin,
    estado: vencida ? 'Completada' : dto.estado,
    fechaCreacion: dto.fechaCreacion,
    space: { id: dto.spaceId, nombre: dto.nombreEspacio, ubicacion: dto.ubicacionEspacio },
    user: { id: dto.userId, nombre: dto.nombreUsuario },
  };
}

/** Usuario parcial a partir del login, por si falla la consulta del perfil completo. */
export function userFromAuth(res: ApiAuthResponse): User {
  return { id: res.userId, nombre: res.nombre, email: res.email, rol: res.rol, telefono: '', facultad: '', fechaRegistro: '' };
}

/** Funcionalidad que la API todavia no expone. */
export function notAvailable<T>(feature: string): Observable<T> {
  return throwError(() => apiError(501, `${feature} aún no está disponible en el servidor.`));
}
