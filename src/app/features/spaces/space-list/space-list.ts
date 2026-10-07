import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { catchError, debounceTime, of, startWith, switchMap, tap } from 'rxjs';
import { Space, TIPOS_ESPACIO, TipoEspacio } from '../../../core/models/space';
import { AuthService } from '../../../core/services/auth';
import { NotifyService } from '../../../core/services/notify';
import { SpaceService } from '../../../core/services/space';
import { spaceIcon } from '../../../core/utils/space-icons';
import { SpaceCard } from '../../shared/space-card/space-card';

@Component({
  selector: 'app-space-list',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    SpaceCard,
  ],
  templateUrl: './space-list.html',
  styleUrl: './space-list.css',
})
export class SpaceList {
  private readonly spaceService = inject(SpaceService);
  private readonly notify = inject(NotifyService);
  protected readonly auth = inject(AuthService);

  protected readonly tipos = TIPOS_ESPACIO;
  protected readonly spaceIcon = spaceIcon;
  protected readonly spaces = signal<Space[]>([]);
  protected readonly loading = signal(true);

  protected readonly filters = inject(FormBuilder).nonNullable.group({
    search: '',
    tipo: '' as TipoEspacio | '',
    capacidadMin: null as number | null,
  });

  constructor() {
    this.filters.valueChanges
      .pipe(
        startWith(this.filters.getRawValue()),
        debounceTime(250),
        tap(() => this.loading.set(true)),
        switchMap(() =>
          this.spaceService.list(this.filters.getRawValue()).pipe(
            catchError((err) => {
              this.notify.fromError(err);
              return of([]);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((spaces) => {
        this.spaces.set(spaces);
        this.loading.set(false);
      });
  }

  protected selectTipo(tipo: TipoEspacio | ''): void {
    this.filters.controls.tipo.setValue(this.filters.controls.tipo.value === tipo ? '' : tipo);
  }

  protected clear(): void {
    this.filters.reset();
  }
}
