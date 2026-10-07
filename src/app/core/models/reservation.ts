import { Space } from './space';
import { User } from './user';

export type EstadoReserva = 'Activa' | 'Cancelada' | 'Completada';

export interface Reservation {
  id: number;
  userId: number;
  spaceId: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estado: EstadoReserva;
  fechaCreacion: string;
  space?: Pick<Space, 'id' | 'nombre' | 'ubicacion'> & Partial<Pick<Space, 'tipo'>>;
  user?: Pick<User, 'id' | 'nombre'> & Partial<Pick<User, 'email'>>;
}

export interface ReservationRequest {
  spaceId: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
}

export const MAX_RESERVAS_ACTIVAS = 3;
