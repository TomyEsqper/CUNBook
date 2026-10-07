import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';
import { ADMIN_ROLES, RESERVER_ROLES } from './core/models/user';
import { AuthService } from './core/services/auth';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: () => (inject(AuthService).isLoggedIn() ? '/home' : '/login'),
  },
  {
    path: '',
    loadComponent: () => import('./layout/public-layout/public-layout').then((m) => m.PublicLayout),
    children: [
      {
        path: 'login',
        canActivate: [guestGuard],
        title: 'Iniciar sesión | RESERVAS CUN',
        loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
      },
      {
        path: 'register',
        canActivate: [guestGuard],
        title: 'Registro | RESERVAS CUN',
        loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
      },
      {
        path: 'ayuda',
        title: 'Ayuda | RESERVAS CUN',
        loadComponent: () => import('./features/help/help').then((m) => m.Help),
      },
    ],
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
    children: [
      {
        path: 'home',
        title: 'Inicio | RESERVAS CUN',
        loadComponent: () => import('./features/home/home').then((m) => m.Home),
      },
      {
        path: 'help',
        title: 'Ayuda | RESERVAS CUN',
        loadComponent: () => import('./features/help/help').then((m) => m.Help),
      },
      {
        path: 'spaces',
        title: 'Espacios | RESERVAS CUN',
        loadComponent: () =>
          import('./features/spaces/space-list/space-list').then((m) => m.SpaceList),
      },
      {
        path: 'spaces/:id',
        title: 'Detalle del espacio | RESERVAS CUN',
        loadComponent: () =>
          import('./features/spaces/space-detail/space-detail').then((m) => m.SpaceDetail),
      },
      {
        path: 'calendar',
        title: 'Calendario | RESERVAS CUN',
        canActivate: [roleGuard],
        data: { roles: RESERVER_ROLES },
        loadComponent: () =>
          import('./features/reservations/calendar/calendar').then((m) => m.Calendar),
      },
      {
        path: 'reservations',
        title: 'Mis reservas | RESERVAS CUN',
        canActivate: [roleGuard],
        data: { roles: RESERVER_ROLES },
        loadComponent: () =>
          import('./features/reservations/my-reservations/my-reservations').then(
            (m) => m.MyReservations,
          ),
      },
      {
        path: 'reservations/new',
        title: 'Nueva reserva | RESERVAS CUN',
        canActivate: [roleGuard],
        data: { roles: RESERVER_ROLES },
        loadComponent: () =>
          import('./features/reservations/reservation-form/reservation-form').then(
            (m) => m.ReservationForm,
          ),
      },
      {
        path: 'reservations/:id/edit',
        title: 'Modificar reserva | RESERVAS CUN',
        canActivate: [roleGuard],
        data: { roles: RESERVER_ROLES },
        loadComponent: () =>
          import('./features/reservations/reservation-form/reservation-form').then(
            (m) => m.ReservationForm,
          ),
      },
      {
        path: 'profile',
        title: 'Mi perfil | RESERVAS CUN',
        loadComponent: () => import('./features/auth/profile/profile').then((m) => m.Profile),
      },
      {
        path: 'admin/spaces',
        title: 'Administrar espacios | RESERVAS CUN',
        canActivate: [roleGuard],
        data: { roles: ADMIN_ROLES },
        loadComponent: () =>
          import('./features/admin/admin-spaces/admin-spaces').then((m) => m.AdminSpaces),
      },
      {
        path: 'admin/reports',
        title: 'Reportes | RESERVAS CUN',
        canActivate: [roleGuard],
        data: { roles: ADMIN_ROLES },
        loadComponent: () =>
          import('./features/admin/admin-reports/admin-reports').then((m) => m.AdminReports),
      },
      {
        path: 'admin/users',
        title: 'Usuarios | RESERVAS CUN',
        canActivate: [roleGuard],
        data: { roles: ADMIN_ROLES },
        loadComponent: () =>
          import('./features/admin/admin-users/admin-users').then((m) => m.AdminUsers),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
