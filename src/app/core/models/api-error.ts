import { HttpErrorResponse } from '@angular/common/http';

/** Formato de error que devuelve el backend (clase ErrorResponse). */
export interface ErrorResponse {
  error: string;
  detalles?: string[];
}

export function apiError(status: number, message: string): HttpErrorResponse {
  const error: ErrorResponse = { error: message };
  return new HttpErrorResponse({ status, error });
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return 'No se pudo conectar con el servidor.';
    }
    const body = err.error;
    if (typeof body === 'string' && body) {
      return body;
    }
    if (body?.detalles?.length) {
      return body.detalles.join(' ');
    }
    if (body?.error) {
      return body.error;
    }
    if (body?.title) {
      return body.title;
    }
  }
  return 'Ocurrió un error interno al procesar la solicitud.';
}
