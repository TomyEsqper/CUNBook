import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth';
import { NotifyService } from '../services/notify';

/**
 * Manejo global de errores HTTP: sesion expirada (401) y servidor caido (0).
 * Los errores de negocio (400/404) los muestra cada componente con su mensaje.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const notify = inject(NotifyService);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        const isLogin = req.url.includes('/auth/login');
        if (err.status === 401 && !isLogin && auth.isLoggedIn()) {
          notify.error('Tu sesión expiró. Inicia sesión nuevamente.');
          auth.logout();
        } else if (err.status === 0) {
          notify.error('No se pudo conectar con el servidor. ¿Está corriendo el backend?');
        }
      }
      return throwError(() => err);
    }),
  );
};
