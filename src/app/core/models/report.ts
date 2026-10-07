export interface SpaceUsage {
  spaceId: number;
  nombre: string;
  tipo: string;
  totalReservas: number;
  horasReservadas: number;
  /** Porcentaje 0-100 de horas reservadas sobre horas de funcionamiento del periodo. */
  ocupacion: number;
}

export interface HourDemand {
  hora: string;
  total: number;
}

export interface ReportSummary {
  totalReservas: number;
  reservasActivas: number;
  reservasCanceladas: number;
  totalUsuarios: number;
  totalEspacios: number;
  ocupacionPromedio: number;
  espacios: SpaceUsage[];
  demandaPorHora: HourDemand[];
}
