export type TipoNotificacion = 'Confirmacion' | 'Recordatorio' | 'Cancelacion' | 'Aviso';

export interface AppNotification {
  id: number;
  userId: number;
  tipo: TipoNotificacion;
  mensaje: string;
  fechaEnvio: string;
  leida: boolean;
}
