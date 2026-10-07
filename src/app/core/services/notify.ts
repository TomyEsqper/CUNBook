import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { getErrorMessage } from '../models/api-error';

@Injectable({
  providedIn: 'root',
})
export class NotifyService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.snackBar.open(message, 'OK', { duration: 3500, panelClass: 'snack-success' });
  }

  error(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 6000, panelClass: 'snack-error' });
  }

  /** Muestra el `message` del ErrorResponse del backend. */
  fromError(err: unknown): void {
    this.error(getErrorMessage(err));
  }
}
