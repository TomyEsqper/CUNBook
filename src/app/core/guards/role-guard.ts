import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Rol } from '../models/user';
import { AuthService } from '../services/auth';

/** Uso: `canActivate: [roleGuard], data: { roles: ['Admin'] }`. */
export const roleGuard: CanActivateFn = (route) => {
  const roles = (route.data['roles'] ?? []) as Rol[];
  if (inject(AuthService).hasRole(...roles)) {
    return true;
  }
  return inject(Router).createUrlTree(['/home']);
};
