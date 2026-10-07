import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { notAvailable } from '../api/backend';
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

  list(): Observable<User[]> {
    return environment.useMocks
      ? this.mock.run(() => this.mock.listUsers())
      : notAvailable('La gestión de usuarios');
  }

  updateRole(id: number, rol: Rol): Observable<User> {
    return environment.useMocks
      ? this.mock.run(() => this.mock.updateRole(id, rol))
      : notAvailable('El cambio de rol');
  }
}
