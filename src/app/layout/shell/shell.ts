import { Component, computed, inject, signal } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ADMIN_ROLES, RESERVER_ROLES, ROLES, Rol } from '../../core/models/user';
import { AuthService } from '../../core/services/auth';
import { MockDb } from '../../core/services/mock-db';
import { CunLogo } from '../cun-logo/cun-logo';
import { SiteFooter } from '../site-footer/site-footer';

interface NavItem {
  label: string;
  icon: string;
  link: string;
  roles?: Rol[];
}

const TOP_NAV: NavItem[] = [
  { label: 'Inicio', icon: 'home', link: '/home' },
  { label: 'Espacios', icon: 'meeting_room', link: '/spaces' },
  { label: 'Mi Perfil', icon: 'person', link: '/profile' },
  { label: 'Mis Reservas', icon: 'event_note', link: '/reservations', roles: RESERVER_ROLES },
  { label: 'Ayuda', icon: 'help', link: '/help' },
];

const SIDE_NAV: NavItem[] = [
  { label: 'Nueva reserva', icon: 'event_available', link: '/reservations/new', roles: RESERVER_ROLES },
  { label: 'Calendario de disponibilidad', icon: 'calendar_month', link: '/calendar', roles: RESERVER_ROLES },
  { label: 'Mi perfil', icon: 'person_outline', link: '/profile' },
];

/** Reportes y usuarios solo existen en el modo mock: la API aun no tiene esos endpoints. */
const ADMIN_NAV: NavItem[] = [
  { label: 'Gestionar espacios', icon: 'domain', link: '/admin/spaces', roles: ADMIN_ROLES },
  ...(environment.useMocks
    ? [
        { label: 'Reportes', icon: 'insights', link: '/admin/reports', roles: ADMIN_ROLES },
        { label: 'Usuarios', icon: 'group', link: '/admin/users', roles: ADMIN_ROLES },
      ]
    : []),
];

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    MatTooltipModule,
    CunLogo,
    SiteFooter,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell {
  protected readonly auth = inject(AuthService);
  private readonly mockDb = inject(MockDb);
  private readonly router = inject(Router);

  protected readonly useMocks = environment.useMocks;
  protected readonly menuOpen = signal(false);

  private readonly allowed = (items: NavItem[]) =>
    items.filter((item) => !item.roles || this.auth.hasRole(...item.roles));
  protected readonly topNav = computed(() => this.allowed(TOP_NAV));
  protected readonly sideNav = computed(() => this.allowed(SIDE_NAV));
  protected readonly adminNav = computed(() => this.allowed(ADMIN_NAV));

  protected readonly rolLabel = computed(
    () => ROLES.find((r) => r.value === this.auth.user()?.rol)?.label ?? '',
  );

  protected readonly firstName = computed(() => this.auth.user()?.nombre.split(' ')[0] ?? '');

  protected readonly initials = computed(() =>
    (this.auth.user()?.nombre ?? '?')
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase(),
  );

  protected resetDemo(): void {
    this.mockDb.reset();
    try {
      this.mockDb.userIdFromToken(this.auth.token());
    } catch {
      this.auth.logout();
      return;
    }
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => this.router.navigate(['/home']));
  }
}
