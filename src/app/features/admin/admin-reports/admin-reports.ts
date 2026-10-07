import { DatePipe } from '@angular/common';
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
import { ReportSummary } from '../../../core/models/report';
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

  protected readonly report = signal<ReportSummary | null>(null);
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

  protected readonly maxReservas = computed(() =>
    Math.max(1, ...(this.report()?.espacios.map((e) => e.totalReservas) ?? [])),
  );
  protected readonly maxDemanda = computed(() =>
    Math.max(1, ...(this.report()?.demandaPorHora.map((d) => d.total) ?? [])),
  );
  protected readonly horaPico = computed(() => {
    const demanda = this.report()?.demandaPorHora ?? [];
    return demanda.reduce<{ hora: string; total: number } | null>(
      (max, d) => (!max || d.total > max.total ? d : max),
      null,
    );
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.reportService.summary().subscribe({
      next: (report) => this.report.set(report),
      error: (err) => this.notify.fromError(err),
    });
    this.reservationService.all().subscribe({
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

  protected cancel(r: Reservation): void {
    const data: ConfirmDialogData = {
      title: `Cancelar reserva #${r.id}`,
      message: `Se cancelará por motivos administrativos la reserva de ${r.user?.nombre} en ${r.space?.nombre}. El usuario será notificado por correo.`,
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
}
