import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { AppNotification, TipoNotificacion } from '../../core/models/notification';
import { Reservation } from '../../core/models/reservation';
import { Space } from '../../core/models/space';
import { Rol } from '../../core/models/user';
import { AuthService } from '../../core/services/auth';
import { NotificationService } from '../../core/services/notification';
import { NotifyService } from '../../core/services/notify';
import { ReservationService } from '../../core/services/reservation';
import { SpaceService } from '../../core/services/space';
import { fromIsoDate, shortTime } from '../../core/utils/date-utils';
import { SpaceCard } from '../shared/space-card/space-card';

const WELCOME: Record<Rol, string> = {
  Estudiante: 'estudiante',
  Docente: 'docente',
  Admin: 'administrador',
};

const NOTIFICATION_ICONS: Record<TipoNotificacion, string> = {
  Confirmacion: 'check_circle',
  Recordatorio: 'alarm',
  Cancelacion: 'cancel',
  Aviso: 'campaign',
};

const FEATURED_SPACES = 3;

@Component({
  selector: 'app-home',
  imports: [DatePipe, RouterLink, MatIconModule, MatProgressSpinnerModule, SpaceCard],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  private readonly spaceService = inject(SpaceService);
  private readonly reservationService = inject(ReservationService);
  private readonly notificationService = inject(NotificationService);
  private readonly notify = inject(NotifyService);
  protected readonly auth = inject(AuthService);

  protected readonly allSpaces = signal<Space[]>([]);
  protected readonly spaces = computed(() => this.allSpaces().filter((s) => s.disponible));
  protected readonly totalCapacity = computed(() => this.spaces().reduce((sum, s) => sum + s.capacidad, 0));
  protected readonly upcoming = signal<Reservation[]>([]);
  protected readonly notifications = signal<AppNotification[]>([]);
  protected readonly loading = signal(true);
  protected readonly shortTime = shortTime;
  protected readonly fromIsoDate = fromIsoDate;

  protected readonly welcome = computed(() => {
    const rol = this.auth.user()?.rol;
    return rol ? WELCOME[rol] : 'estudiante';
  });

  protected readonly featured = computed(() => this.spaces().slice(0, FEATURED_SPACES));
  protected readonly unread = computed(() => this.notifications().filter((n) => !n.leida).length);
  /** No leidas primero; dentro de cada grupo se respeta el orden del servidor. */
  protected readonly sortedNotifications = computed(() =>
    [...this.notifications()].sort((a, b) => Number(a.leida) - Number(b.leida)).slice(0, 5),
  );

  ngOnInit(): void {
    this.spaceService.list({ incluirInactivos: true }).subscribe({
      next: (spaces) => {
        this.allSpaces.set(spaces);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.notify.fromError(err);
      },
    });
    if (!this.auth.canReserve()) {
      return this.loadNotifications();
    }
    this.reservationService.mine().subscribe({
      next: (list) =>
        this.upcoming.set(
          list
            .filter((r) => r.estado === 'Activa')
            .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horaInicio.localeCompare(b.horaInicio))
            .slice(0, 3),
        ),
      error: (err) => this.notify.fromError(err),
    });
    this.loadNotifications();
  }

  private loadNotifications(): void {
    this.notificationService.mine().subscribe({
      next: (list) => this.notifications.set(list),
      error: (err) => this.notify.fromError(err),
    });
  }

  protected icon(n: AppNotification): string {
    return NOTIFICATION_ICONS[n.tipo];
  }

  protected markAsRead(n: AppNotification): void {
    if (n.leida) {
      return;
    }
    this.notificationService.markAsRead(n.id).subscribe({
      next: () =>
        this.notifications.update((list) => list.map((x) => (x.id === n.id ? { ...x, leida: true } : x))),
      error: (err) => this.notify.fromError(err),
    });
  }
}
