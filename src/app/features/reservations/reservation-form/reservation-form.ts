import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, startWith, switchMap } from 'rxjs';
import { getErrorMessage } from '../../../core/models/api-error';
import { Reservation } from '../../../core/models/reservation';
import { OccupiedSlot, Space } from '../../../core/models/space';
import { NotifyService } from '../../../core/services/notify';
import { ReservationService } from '../../../core/services/reservation';
import { SpaceService } from '../../../core/services/space';
import {
  combineDateTime,
  dayOfWeek,
  fromIsoDate,
  overlaps,
  shortTime,
  timeSlots,
  timeToMinutes,
  toIsoDate,
} from '../../../core/utils/date-utils';
import { spaceIcon } from '../../../core/utils/space-icons';

@Component({
  selector: 'app-reservation-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatProgressBarModule,
  ],
  templateUrl: './reservation-form.html',
  styleUrl: './reservation-form.css',
})
export class ReservationForm implements OnInit {
  private readonly reservations = inject(ReservationService);
  private readonly spaceService = inject(SpaceService);
  private readonly notify = inject(NotifyService);
  private readonly router = inject(Router);

  /** Ruta /reservations/:id/edit. */
  readonly id = input<string>();
  /** Query params opcionales para precargar (desde calendario o listado). */
  readonly spaceId = input<string>();
  readonly fecha = input<string>();
  readonly horaInicio = input<string>();
  readonly horaFin = input<string>();

  protected readonly isEdit = computed(() => !!this.id());
  protected readonly spaces = signal<Space[]>([]);
  protected readonly reservation = signal<Reservation | null>(null);
  protected readonly selectedSpace = signal<Space | null>(null);
  protected readonly occupied = signal<OccupiedSlot[]>([]);
  protected readonly saving = signal(false);
  protected readonly loading = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly minDate = new Date();
  protected readonly slots = timeSlots('06:00', '22:00');
  protected readonly shortTime = shortTime;
  protected readonly spaceIcon = spaceIcon;

  protected readonly form = inject(FormBuilder).group({
    spaceId: [null as number | null, Validators.required],
    fecha: [null as Date | null, Validators.required],
    horaInicio: ['', Validators.required],
    horaFin: ['', Validators.required],
  });

  /** Incluye controles deshabilitados (el espacio queda bloqueado al editar). */
  private readonly value = toSignal(
    this.form.valueChanges.pipe(
      map(() => this.form.getRawValue()),
      startWith(this.form.getRawValue()),
    ),
    { initialValue: this.form.getRawValue() },
  );

  protected readonly endSlots = computed(() => {
    const inicio = this.value().horaInicio;
    return inicio ? this.slots.filter((s) => timeToMinutes(s) > timeToMinutes(inicio)) : this.slots;
  });

  /** Validaciones del lado del cliente, espejo de las reglas del backend. */
  protected readonly warnings = computed(() => {
    const { fecha, horaInicio, horaFin } = this.value();
    const space = this.selectedSpace();
    const warnings: string[] = [];
    if (!fecha || !horaInicio || !horaFin || !space) {
      return warnings;
    }
    const iso = toIsoDate(fecha);
    if (timeToMinutes(horaFin) <= timeToMinutes(horaInicio)) {
      warnings.push('La hora de fin debe ser mayor que la hora de inicio.');
    }
    if (combineDateTime(iso, horaInicio) <= new Date()) {
      warnings.push('No se puede reservar una fecha u hora que ya pasó.');
    }
    if (!space.disponible) {
      warnings.push('El espacio no está disponible para reservas.');
    }
    const dia = dayOfWeek(fecha);
    const opera = space.horarios?.some(
      (h) =>
        h.diaSemana === dia &&
        h.estaDisponible &&
        timeToMinutes(h.horaInicio) <= timeToMinutes(horaInicio) &&
        timeToMinutes(h.horaFin) >= timeToMinutes(horaFin),
    );
    if (!opera) {
      warnings.push('El espacio no opera en la franja horaria solicitada.');
    }
    if (this.conflicts().length) {
      warnings.push('El espacio ya está ocupado en esa franja horaria.');
    }
    return warnings;
  });

  protected readonly conflicts = computed(() => {
    const { horaInicio, horaFin } = this.value();
    if (!horaInicio || !horaFin) {
      return [];
    }
    return this.occupiedOthers().filter((o) => overlaps(o.horaInicio, o.horaFin, horaInicio, horaFin));
  });

  /** Ocupacion del dia sin contar la reserva que se esta editando. */
  protected readonly occupiedOthers = computed(() =>
    this.occupied().filter((o) => o.reservationId !== this.reservation()?.id),
  );

  protected readonly todaySchedule = computed(() => {
    const fecha = this.value().fecha;
    if (!fecha) {
      return null;
    }
    const dia = dayOfWeek(fecha);
    const horario = this.selectedSpace()?.horarios?.find((h) => h.diaSemana === dia && h.estaDisponible);
    return { dia, horario };
  });

  protected readonly canEdit = computed(() => !this.isEdit() || this.reservation()?.estado === 'Activa');

  constructor() {
    this.spaceService
      .list()
      .pipe(takeUntilDestroyed())
      .subscribe((spaces) => this.spaces.set(spaces));

    const selection = computed(
      () => ({
        spaceId: this.value().spaceId,
        fecha: this.value().fecha ? toIsoDate(this.value().fecha!) : null,
      }),
      { equal: (a, b) => a.spaceId === b.spaceId && a.fecha === b.fecha },
    );

    toObservable(selection)
      .pipe(
        switchMap(({ spaceId, fecha }) => {
          if (!spaceId) {
            return of({ space: null, occupied: [] as OccupiedSlot[] });
          }
          return forkJoin({
            space: this.spaceService.get(spaceId),
            occupied: fecha ? this.spaceService.occupied(spaceId, fecha, fecha) : of([] as OccupiedSlot[]),
          }).pipe(
            catchError((err) => {
              this.notify.fromError(err);
              return of({ space: null, occupied: [] as OccupiedSlot[] });
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe(({ space, occupied }) => {
        this.selectedSpace.set(space);
        this.occupied.set(occupied);
      });
  }

  ngOnInit(): void {
    const id = Number(this.id());
    if (id) {
      this.loading.set(true);
      this.reservations.get(id).subscribe({
        next: (r) => {
          this.reservation.set(r);
          this.form.setValue({
            spaceId: r.spaceId,
            fecha: fromIsoDate(r.fecha),
            horaInicio: shortTime(r.horaInicio),
            horaFin: shortTime(r.horaFin),
          });
          this.form.controls.spaceId.disable();
          if (r.estado !== 'Activa') {
            this.form.disable();
          }
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.notify.fromError(err);
          this.router.navigate(['/reservations']);
        },
      });
      return;
    }

    this.form.patchValue({
      spaceId: Number(this.spaceId()) || null,
      fecha: this.fecha() ? fromIsoDate(this.fecha()!) : null,
      horaInicio: this.horaInicio() ?? '',
      horaFin: this.horaFin() ?? '',
    });
  }

  /** Rellena el formulario con una franja libre sugerida al hacer clic en el horario del dia. */
  protected pickFreeSlot(inicio: string, fin: string): void {
    this.form.patchValue({ horaInicio: shortTime(inicio), horaFin: shortTime(fin) });
  }

  protected readonly freeSlots = computed(() => {
    const schedule = this.todaySchedule()?.horario;
    if (!schedule) {
      return [];
    }
    const busy = [...this.occupiedOthers()].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
    const free: { inicio: string; fin: string }[] = [];
    let cursor = schedule.horaInicio;
    for (const o of busy) {
      if (timeToMinutes(o.horaInicio) > timeToMinutes(cursor)) {
        free.push({ inicio: cursor, fin: o.horaInicio });
      }
      if (timeToMinutes(o.horaFin) > timeToMinutes(cursor)) {
        cursor = o.horaFin;
      }
    }
    if (timeToMinutes(schedule.horaFin) > timeToMinutes(cursor)) {
      free.push({ inicio: cursor, fin: schedule.horaFin });
    }
    return free;
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const body = {
      spaceId: raw.spaceId!,
      fecha: toIsoDate(raw.fecha!),
      horaInicio: raw.horaInicio!,
      horaFin: raw.horaFin!,
    };
    this.saving.set(true);
    this.serverError.set(null);
    const id = this.reservation()?.id;
    const request$ = id ? this.reservations.update(id, body) : this.reservations.create(body);
    request$.subscribe({
      next: (r) => {
        this.notify.success(
          id
            ? `Reserva #${r.id} modificada. Te enviamos la confirmación por correo.`
            : `Reserva #${r.id} confirmada. Te enviamos la confirmación por correo.`,
        );
        this.router.navigate(['/reservations']);
      },
      error: (err) => {
        this.saving.set(false);
        this.serverError.set(getErrorMessage(err));
      },
    });
  }
}
