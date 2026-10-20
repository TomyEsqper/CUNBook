import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Rol, UpdateProfileRequest, User } from '../models/user';
import { AuthService } from './auth';
import { MockDb } from './mock-db';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly mock = inject(MockDb);
  private readonly auth = inject(AuthService);
  private readonly url = `${environment.apiUrl}/users`;

  me(): Observable<User> {
    return environment.useMocks
      ? this.mock.run(() => this.mock.getUser(this.auth.currentUserId()))
      : this.http.get<User>(`${this.url}/profile`);
  }

  updateProfile(req: UpdateProfileRequest): Observable<User> {
    const request$ = environment.useMocks
      ? this.mock.run(() => this.mock.updateProfile(this.auth.currentUserId(), req))
      : this.http.put<User>(`${this.url}/profile`, req);
    return request$.pipe(tap((user) => this.auth.updateStoredUser(user)));
  }

  /** GET /api/admin/users. Solo administradores. No incluye contraseñas. */
  list(): Observable<User[]> {
    return environment.useMocks
      ? this.mock.run(() => this.mock.listUsers())
      : this.http.get<User[]>(`${environment.apiUrl}/admin/users`);
  }

  /** PUT /api/admin/users/{id}/rol. Solo administradores. */
  updateRole(id: number, rol: Rol): Observable<User> {
    return environment.useMocks
      ? this.mock.run(() => this.mock.updateRole(id, rol))
      : this.http.put<User>(`${environment.apiUrl}/admin/users/${id}/rol`, { rol });
  }
}
