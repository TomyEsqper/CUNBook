import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { filter, switchMap } from 'rxjs';
import { DashboardStats, EstadoStat } from '../../../core/models/report';
import { Reservation } from '../../../core/models/reservation';
import { NotifyService } from '../../../core/services/notify';
import { ReportService } from '../../../core/services/report';
import { ReservationService } from '../../../core/services/reservation';
import { fromIsoDate, shortTime } from '../../../core/utils/date-utils';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-admin-reports',
  imports: [
    DatePipe,
    FormsModule,
    MatCardModule,
    MatTabsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatProgressBarModule,
  ],
  templateUrl: './admin-reports.html',
  styleUrl: './admin-reports.css',
})
export class AdminReports implements OnInit {
  private readonly reportService = inject(ReportService);
  private readonly reservationService = inject(ReservationService);
  private readonly notify = inject(NotifyService);
  private readonly dialog = inject(MatDialog);

  protected readonly stats = signal<DashboardStats | null>(null);
  protected readonly statsUnavailable = signal(false);
  protected readonly reservations = signal<Reservation[]>([]);
  protected readonly loading = signal(true);
  protected readonly search = signal('');
  protected readonly shortTime = shortTime;
  protected readonly fromIsoDate = fromIsoDate;
  protected readonly columns = ['id', 'espacio', 'usuario', 'fecha', 'horario', 'acciones'];

  protected readonly activas = computed(() => {
    const term = this.search().trim().toLowerCase();
    return this.reservations()
      .filter((r) => r.estado === 'Activa')
      .filter(
        (r) =>
          !term ||
          r.space?.nombre.toLowerCase().includes(term) ||
          r.user?.nombre.toLowerCase().includes(term) ||
          r.user?.email?.toLowerCase().includes(term),
      )
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horaInicio.localeCompare(b.horaInicio));
  });

  protected readonly maxPorEspacio = computed(() =>
    Math.max(1, ...(this.stats()?.reservasPorEspacio.map((e) => e.cantidad) ?? [])),
  );
  protected readonly donut = computed(() => conicGradient(this.stats()?.reservasPorEstado ?? []));

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    let pending = 2;
    const done = (): void => {
      pending -= 1;
      if (pending === 0) {
        this.loading.set(false);
      }
    };
    this.statsUnavailable.set(false);
    this.reportService.summary().subscribe({
      next: (stats) => {
        this.stats.set(stats);
        done();
      },
      error: (err) => {
        if (err instanceof HttpErrorResponse && err.status === 404) {
          this.statsUnavailable.set(true);
        } else {
          this.notify.fromError(err);
        }
        done();
      },
    });
    this.reservationService.all().subscribe({
      next: (list) => {
        this.reservations.set(list);
        done();
      },
      error: (err) => {
        this.notify.fromError(err);
        done();
      },
    });
  }

  protected cancel(r: Reservation): void {
    const data: ConfirmDialogData = {
      title: `Cancelar reserva #${r.id}`,
      message: `Se cancelará por motivos administrativos la reserva de ${r.user?.nombre} en ${r.space?.nombre}.`,
      confirmText: 'Cancelar reserva',
      danger: true,
    };
    this.dialog
      .open(ConfirmDialog, { data, width: '460px' })
      .afterClosed()
      .pipe(
        filter(Boolean),
        switchMap(() => this.reservationService.adminCancel(r.id)),
      )
      .subscribe({
        next: () => {
          this.notify.success(`Reserva #${r.id} cancelada.`);
          this.load();
        },
        error: (err) => this.notify.fromError(err),
      });
  }

  protected estadoClass(nombre: EstadoStat['nombreEstado']): string {
    switch (nombre) {
      case 'Activa':
        return 'activa';
      case 'Cancelada':
        return 'cancelada';
      case 'Completada':
        return 'completada';
    }
  }
}

const ESTADO_COLOR: Record<EstadoStat['nombreEstado'], string> = {
  Activa: 'var(--mat-sys-primary)',
  Cancelada: 'var(--mat-sys-error)',
  Completada: 'var(--mat-sys-tertiary)',
};

function conicGradient(items: EstadoStat[]): string {
  const total = items.reduce((sum, item) => sum + item.cantidad, 0);
  if (!total) {
    return 'var(--mat-sys-surface-container-high)';
  }
  let cursor = 0;
  const stops = items.map((item) => {
    const start = (cursor / total) * 100;
    cursor += item.cantidad;
    const end = (cursor / total) * 100;
    return `${ESTADO_COLOR[item.nombreEstado]} ${start}% ${end}%`;
  });
  return `conic-gradient(${stops.join(', ')})`;
}
