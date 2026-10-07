import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppNotification } from '../models/notification';
import { AuthService } from './auth';
import { MockDb } from './mock-db';

/** La API todavia no tiene notificaciones: fuera del modo mock el panel queda vacio. */
@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly mock = inject(MockDb);
  private readonly auth = inject(AuthService);

  /** Notificaciones del usuario autenticado, mas recientes primero. */
  mine(): Observable<AppNotification[]> {
    return environment.useMocks
      ? this.mock.run(() => this.mock.listNotifications(this.auth.currentUserId()))
      : of([]);
  }

  markAsRead(id: number): Observable<void> {
    return environment.useMocks
      ? this.mock.run(() => this.mock.markNotificationRead(this.auth.currentUserId(), id))
      : of(undefined);
  }
}
