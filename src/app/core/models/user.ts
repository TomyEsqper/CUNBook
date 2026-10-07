export type Rol = 'Estudiante' | 'Docente' | 'Admin';

export const ROLES: { value: Rol; label: string }[] = [
  { value: 'Estudiante', label: 'Estudiante' },
  { value: 'Docente', label: 'Docente' },
  { value: 'Admin', label: 'Administrador' },
];

export const ADMIN_ROLES: Rol[] = ['Admin'];

/** Roles que hacen reservas; el administrador solo gestiona espacios. */
export const RESERVER_ROLES: Rol[] = ['Estudiante', 'Docente'];

export interface User {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  telefono: string;
  facultad: string;
  fechaRegistro: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  nombre: string;
  email: string;
  password: string;
  telefono: string;
  facultad: string;
  rol: Rol;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface UpdateProfileRequest {
  nombre: string;
  telefono: string;
  facultad: string;
}
