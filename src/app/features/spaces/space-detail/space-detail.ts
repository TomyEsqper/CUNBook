import { Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { catchError, of, switchMap, tap } from 'rxjs';
import { DIAS_SEMANA, Space } from '../../../core/models/space';
import { AuthService } from '../../../core/services/auth';
import { NotifyService } from '../../../core/services/notify';
import { SpaceService } from '../../../core/services/space';
import { shortTime } from '../../../core/utils/date-utils';
import { spaceIcon } from '../../../core/utils/space-icons';
import { Calendar } from '../../reservations/calendar/calendar';

@Component({
  selector: 'app-space-detail',
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, Calendar],
  templateUrl: './space-detail.html',
  styleUrl: './space-detail.css',
})
export class SpaceDetail {
  private readonly spaceService = inject(SpaceService);
  private readonly notify = inject(NotifyService);
  protected readonly auth = inject(AuthService);

  /** Parametro de ruta :id. */
  readonly id = input.required<string>();

  protected readonly space = signal<Space | null>(null);
  protected readonly loading = signal(true);
  protected readonly spaceIcon = spaceIcon;
  protected readonly shortTime = shortTime;

  protected readonly horarios = computed(() => {
    const horarios = this.space()?.horarios ?? [];
    return DIAS_SEMANA.map((dia) => ({ dia, horario: horarios.find((h) => h.diaSemana === dia) }));
  });

  constructor() {
    toObservable(this.id)
      .pipe(
        tap(() => this.loading.set(true)),
        switchMap((id) =>
          this.spaceService.get(Number(id)).pipe(
            catchError((err) => {
              this.notify.fromError(err);
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((space) => {
        this.space.set(space);
        this.loading.set(false);
      });
  }
}
