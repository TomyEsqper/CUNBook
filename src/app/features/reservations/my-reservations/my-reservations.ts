import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { filter, switchMap } from 'rxjs';
import { MAX_RESERVAS_ACTIVAS, Reservation } from '../../../core/models/reservation';
import { NotifyService } from '../../../core/services/notify';
import { ReservationService } from '../../../core/services/reservation';
import { combineDateTime, fromIsoDate, shortTime } from '../../../core/utils/date-utils';
import { spaceIcon } from '../../../core/utils/space-icons';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/confirm-dialog/confirm-dialog';

const ONE_HOUR_MS = 60 * 60 * 1000;

@Component({
  selector: 'app-my-reservations',
  imports: [
    DatePipe,
    NgTemplateOutlet,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './my-reservations.html',
  styleUrl: './my-reservations.css',
})
export class MyReservations implements OnInit {
  private readonly reservationService = inject(ReservationService);
  private readonly notify = inject(NotifyService);
  private readonly dialog = inject(MatDialog);

  protected readonly reservations = signal<Reservation[]>([]);
  protected readonly loading = signal(true);
  protected readonly maxActivas = MAX_RESERVAS_ACTIVAS;
  protected readonly shortTime = shortTime;
  protected readonly fromIsoDate = fromIsoDate;
  protected readonly spaceIcon = spaceIcon;

  /** Proximas primero (orden ascendente). */
  protected readonly activas = computed(() =>
    this.reservations()
      .filter((r) => r.estado === 'Activa')
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horaInicio.localeCompare(b.horaInicio)),
  );
  protected readonly historial = computed(() => this.reservations().filter((r) => r.estado !== 'Activa'));

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.reservationService.mine().subscribe({
      next: (list) => {
        this.reservations.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.notify.fromError(err);
      },
    });
  }

  /** Se permite modificar o cancelar hasta una hora antes del inicio. */
  protected canChange(r: Reservation): boolean {
    return (
      r.estado === 'Activa' && combineDateTime(r.fecha, r.horaInicio).getTime() - Date.now() > ONE_HOUR_MS
    );
  }

  protected cancel(r: Reservation): void {
    const data: ConfirmDialogData = {
      title: `Cancelar reserva #${r.id}`,
      message: `¿Seguro que quieres cancelar la reserva de ${r.space?.nombre ?? 'este espacio'} el ${r.fecha} de ${shortTime(r.horaInicio)} a ${shortTime(r.horaFin)}? Una vez cancelada no se puede reactivar.`,
      confirmText: 'Sí, cancelar',
      danger: true,
    };
    this.dialog
      .open(ConfirmDialog, { data, width: '440px' })
      .afterClosed()
      .pipe(
        filter(Boolean),
        switchMap(() => this.reservationService.cancel(r.id)),
      )
      .subscribe({
        next: () => {
          this.notify.success(`Reserva #${r.id} cancelada. Te enviamos la confirmación por correo.`);
          this.load();
        },
        error: (err) => this.notify.fromError(err),
      });
  }
}
