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
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { filter, map, switchMap } from 'rxjs';
import { Space, SpaceRequest } from '../../../core/models/space';
import { NotifyService } from '../../../core/services/notify';
import { SpaceService } from '../../../core/services/space';
import { spaceIcon } from '../../../core/utils/space-icons';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/confirm-dialog/confirm-dialog';
import { SpaceDialog } from '../space-dialog/space-dialog';

@Component({
  selector: 'app-admin-spaces',
  imports: [
    FormsModule,
    RouterLink,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatProgressBarModule,
  ],
  templateUrl: './admin-spaces.html',
  styleUrl: './admin-spaces.css',
})
export class AdminSpaces implements OnInit {
  private readonly spaceService = inject(SpaceService);
  private readonly notify = inject(NotifyService);
  private readonly dialog = inject(MatDialog);

  protected readonly columns = ['nombre', 'tipo', 'capacidad', 'ubicacion', 'estado', 'acciones'];
  protected readonly spaceIcon = spaceIcon;
  protected readonly spaces = signal<Space[]>([]);
  protected readonly loading = signal(true);
  protected readonly search = signal('');

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    return term
      ? this.spaces().filter(
          (s) => s.nombre.toLowerCase().includes(term) || s.ubicacion.toLowerCase().includes(term),
        )
      : this.spaces();
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.spaceService.list({ incluirInactivos: true }).subscribe({
      next: (spaces) => {
        this.spaces.set(spaces);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.notify.fromError(err);
      },
    });
  }

  protected create(): void {
    this.openDialog(null);
  }

  protected edit(space: Space): void {
    this.spaceService.get(space.id).subscribe({
      next: (full) => this.openDialog(full),
      error: (err) => this.notify.fromError(err),
    });
  }

  protected deactivate(space: Space): void {
    const data: ConfirmDialogData = {
      title: 'Desactivar espacio',
      message: `"${space.nombre}" dejará de aparecer para reservas. No se elimina: puedes reactivarlo después.`,
      confirmText: 'Desactivar',
      danger: true,
    };
    this.dialog
      .open(ConfirmDialog, { data, width: '440px' })
      .afterClosed()
      .pipe(
        filter(Boolean),
        switchMap(() => this.spaceService.deactivate(space.id)),
      )
      .subscribe({
        next: () => {
          this.notify.success('Espacio desactivado.');
          this.load();
        },
        error: (err) => this.notify.fromError(err),
      });
  }

  protected activate(space: Space): void {
    this.spaceService
      .get(space.id)
      .pipe(
        map((full): SpaceRequest => {
          const { id: _id, horarios, ...data } = full;
          return {
            ...data,
            disponible: true,
            horarios: (horarios ?? []).map(({ id: _hid, spaceId: _sid, ...h }) => h),
          };
        }),
        switchMap((body) => this.spaceService.update(space.id, body)),
      )
      .subscribe({
        next: () => {
          this.notify.success('Espacio reactivado.');
          this.load();
        },
        error: (err) => this.notify.fromError(err),
      });
  }

  private openDialog(space: Space | null): void {
    this.dialog
      .open(SpaceDialog, { data: space, width: '720px', maxWidth: '95vw' })
      .afterClosed()
      .pipe(filter(Boolean))
      .subscribe((saved: Space) => {
        this.notify.success(space ? `"${saved.nombre}" actualizado.` : `"${saved.nombre}" creado.`);
        this.load();
      });
  }
}
