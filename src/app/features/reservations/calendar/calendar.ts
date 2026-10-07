import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { catchError, filter, forkJoin, of, switchMap, tap } from 'rxjs';
import { OccupiedSlot, Space } from '../../../core/models/space';
import { NotifyService } from '../../../core/services/notify';
import { SpaceService } from '../../../core/services/space';
import {
  addDays,
  combineDateTime,
  dayOfWeek,
  minutesToTime,
  overlaps,
  startOfWeek,
  timeToMinutes,
  toIsoDate,
} from '../../../core/utils/date-utils';

type CellState = 'free' | 'occupied' | 'closed' | 'past';

interface DayColumn {
  date: Date;
  iso: string;
}

const FIRST_HOUR = 7;
const LAST_HOUR = 21;

@Component({
  selector: 'app-calendar',
  imports: [
    DatePipe,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './calendar.html',
  styleUrl: './calendar.css',
})
export class Calendar {
  private readonly spaceService = inject(SpaceService);
  private readonly notify = inject(NotifyService);
  private readonly router = inject(Router);

  /** Query param `?spaceId=` en /calendar, o valor fijo cuando se usa embebido. */
  readonly spaceId = input<string | number>();
  /** Embebido en el detalle de un espacio: oculta el selector de espacio y el titulo. */
  readonly embedded = input(false);

  protected readonly spaces = signal<Space[]>([]);
  protected readonly selectedId = signal<number | null>(null);
  protected readonly weekStart = signal(startOfWeek(new Date()));
  protected readonly space = signal<Space | null>(null);
  protected readonly occupied = signal<OccupiedSlot[]>([]);
  protected readonly loading = signal(false);

  protected readonly hours = Array.from(
    { length: LAST_HOUR - FIRST_HOUR },
    (_, i) => minutesToTime((FIRST_HOUR + i) * 60),
  );

  protected readonly days = computed<DayColumn[]>(() =>
    Array.from({ length: 7 }, (_, i) => {
      const date = addDays(this.weekStart(), i);
      return { date, iso: toIsoDate(date) };
    }),
  );

  /** Mapa "fecha|hora" -> estado, recalculado cuando cambian semana, espacio u ocupacion. */
  private readonly cells = computed(() => {
    const map = new Map<string, CellState>();
    const space = this.space();
    const now = new Date();
    for (const day of this.days()) {
      const dia = dayOfWeek(day.date);
      const horarios = space?.horarios?.filter((h) => h.diaSemana === dia && h.estaDisponible) ?? [];
      for (const hora of this.hours) {
        const fin = minutesToTime(timeToMinutes(hora) + 60);
        let state: CellState;
        const opens = horarios.some(
          (h) => timeToMinutes(h.horaInicio) <= timeToMinutes(hora) && timeToMinutes(h.horaFin) >= timeToMinutes(fin),
        );
        if (!space?.disponible || !opens) {
          state = 'closed';
        } else if (combineDateTime(day.iso, hora) <= now) {
          state = 'past';
        } else if (
          this.occupied().some((o) => o.fecha === day.iso && overlaps(o.horaInicio, o.horaFin, hora, fin))
        ) {
          state = 'occupied';
        } else {
          state = 'free';
        }
        map.set(`${day.iso}|${hora}`, state);
      }
    }
    return map;
  });

  constructor() {
    effect(() => {
      const id = Number(this.spaceId());
      if (id) {
        this.selectedId.set(id);
      }
    });

    this.spaceService
      .list()
      .pipe(takeUntilDestroyed())
      .subscribe((spaces) => {
        this.spaces.set(spaces);
        if (!this.selectedId() && spaces.length) {
          this.selectedId.set(spaces[0].id);
        }
      });

    const query = computed(() => ({ id: this.selectedId(), week: this.weekStart() }));
    toObservable(query)
      .pipe(
        filter((q): q is { id: number; week: Date } => !!q.id),
        tap(() => this.loading.set(true)),
        switchMap(({ id, week }) =>
          forkJoin({
            space: this.spaceService.get(id),
            occupied: this.spaceService.occupied(id, toIsoDate(week), toIsoDate(addDays(week, 6))),
          }).pipe(
            catchError((err) => {
              this.notify.fromError(err);
              return of({ space: null, occupied: [] as OccupiedSlot[] });
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ space, occupied }) => {
        this.space.set(space);
        this.occupied.set(occupied);
        this.loading.set(false);
      });
  }

  protected cell(day: DayColumn, hora: string): CellState {
    return this.cells().get(`${day.iso}|${hora}`) ?? 'closed';
  }

  protected label(state: CellState): string {
    return { free: 'Disponible', occupied: 'Ocupado', closed: 'Cerrado', past: 'Ya pasó' }[state];
  }

  protected isToday(day: DayColumn): boolean {
    return day.iso === toIsoDate(new Date());
  }

  protected moveWeek(weeks: number): void {
    this.weekStart.update((w) => addDays(w, weeks * 7));
  }

  protected today(): void {
    this.weekStart.set(startOfWeek(new Date()));
  }

  protected reserve(day: DayColumn, hora: string): void {
    if (this.cell(day, hora) !== 'free') {
      return;
    }
    this.router.navigate(['/reservations/new'], {
      queryParams: {
        spaceId: this.selectedId(),
        fecha: day.iso,
        horaInicio: hora,
        horaFin: minutesToTime(timeToMinutes(hora) + 60),
      },
    });
  }
}
