export interface EspacioStat {
  nombreEspacio: string;
  cantidad: number;
}

export interface EstadoStat {
  nombreEstado: 'Activa' | 'Cancelada' | 'Completada';
  cantidad: number;
}

/** Respuesta de GET /api/admin/statistics. */
export interface DashboardStats {
  totalReservas: number;
  reservasActivas: number;
  reservasCanceladas: number;
  espacioMasPopular: string;
  reservasPorEspacio: EspacioStat[];
  reservasPorEstado: EstadoStat[];
}
