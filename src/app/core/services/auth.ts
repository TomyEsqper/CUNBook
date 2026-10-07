import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map, Observable, of, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiAuthResponse, notAvailable, userFromAuth } from '../api/backend';
import {
  ADMIN_ROLES,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  RESERVER_ROLES,
  Rol,
  User,
} from '../models/user';
import { MockDb } from './mock-db';

const TOKEN_KEY = 'cunbook-token';
const USER_KEY = 'cunbook-user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly mock = inject(MockDb);
  private readonly router = inject(Router);
  private readonly url = `${environment.apiUrl}/auth`;

  private readonly _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private readonly _user = signal<User | null>(this.readStoredUser());

  readonly token = this._token.asReadonly();
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => !!this._token() && !!this._user());
  readonly isAdmin = computed(() => this.hasRole(...ADMIN_ROLES));
  readonly canReserve = computed(() => this.hasRole(...RESERVER_ROLES));

  login(req: LoginRequest): Observable<AuthResponse> {
    const request$ = environment.useMocks
      ? this.mock.run(() => this.mock.login(req))
      : this.apiLogin(req);
    return request$.pipe(tap((res) => this.setSession(res)));
  }

  /** El backend registra siempre como Estudiante y no devuelve token, asi que se inicia sesion despues. */
  register(req: RegisterRequest): Observable<AuthResponse> {
    if (environment.useMocks) {
      return this.mock.run(() => this.mock.register(req)).pipe(tap((res) => this.setSession(res)));
    }
    const { nombre, email, password, telefono, facultad } = req;
    return this.http
      .post<User>(`${this.url}/register`, { nombre, email, password, telefono, facultad })
      .pipe(switchMap(() => this.login({ email, password })));
  }

  forgotPassword(email: string): Observable<void> {
    return environment.useMocks
      ? this.mock.run(() => this.mock.forgotPassword(email))
      : notAvailable('La recuperación de contraseña');
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._token.set(null);
    this._user.set(null);
    this.router.navigate(['/login']);
  }

  updateStoredUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this._user.set(user);
  }

  hasRole(...roles: Rol[]): boolean {
    const rol = this._user()?.rol;
    return !!rol && roles.includes(rol);
  }

  /** Id del usuario autenticado; en modo mock se valida contra la base simulada. */
  currentUserId(): number {
    return environment.useMocks ? this.mock.userIdFromToken(this._token()) : (this._user()?.id ?? 0);
  }

  /** El login solo trae nombre, correo y rol; el resto del perfil se pide con el token recien emitido. */
  private apiLogin(req: LoginRequest): Observable<AuthResponse> {
    return this.http.post<ApiAuthResponse>(`${this.url}/login`, req).pipe(
      tap((res) => this.setToken(res.token)),
      switchMap((res) =>
        this.http.get<User>(`${environment.apiUrl}/users/profile`).pipe(
          catchError(() => of(userFromAuth(res))),
          map((user) => ({ token: res.token, user })),
        ),
      ),
    );
  }

  private setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this._token.set(token);
  }

  private setSession(res: AuthResponse): void {
    this.setToken(res.token);
    this.updateStoredUser(res.user);
  }

  private readStoredUser(): User | null {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null');
    } catch {
      return null;
    }
  }
}
