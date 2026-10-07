export type TipoEspacio = 'Aula' | 'Laboratorio' | 'Sala de estudio' | 'Auditorio' | 'Espacio lúdico';

export const TIPOS_ESPACIO: TipoEspacio[] = [
  'Aula',
  'Laboratorio',
  'Sala de estudio',
  'Auditorio',
  'Espacio lúdico',
];

export type DiaSemana = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';

export const DIAS_SEMANA: DiaSemana[] = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

export interface SpaceHorario {
  id: number;
  spaceId: number;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
  estaDisponible: boolean;
}

export interface Space {
  id: number;
  nombre: string;
  capacidad: number;
  ubicacion: string;
  tipo: TipoEspacio;
  descripcion: string;
  horarioFuncionamiento: string;
  disponible: boolean;
  horarios?: SpaceHorario[];
}

export type SpaceRequest = Omit<Space, 'id' | 'horarios'> & {
  horarios: Omit<SpaceHorario, 'id' | 'spaceId'>[];
};

export interface SpaceFilter {
  search?: string;
  tipo?: TipoEspacio | '';
  capacidadMin?: number | null;
  incluirInactivos?: boolean;
}

/** Franja ya ocupada de un espacio, usada para pintar disponibilidad. */
export interface OccupiedSlot {
  reservationId: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
}
