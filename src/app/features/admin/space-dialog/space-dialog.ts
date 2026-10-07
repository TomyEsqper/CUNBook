import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { getErrorMessage } from '../../../core/models/api-error';
import { DIAS_SEMANA, Space, SpaceRequest, TIPOS_ESPACIO, TipoEspacio } from '../../../core/models/space';
import { SpaceService } from '../../../core/services/space';
import { shortTime, timeSlots, timeToMinutes, toApiTime } from '../../../core/utils/date-utils';

@Component({
  selector: 'app-space-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatSlideToggleModule,
    MatProgressBarModule,
  ],
  templateUrl: './space-dialog.html',
  styleUrl: './space-dialog.css',
})
export class SpaceDialog {
  private readonly spaceService = inject(SpaceService);
  private readonly dialogRef = inject(MatDialogRef<SpaceDialog, Space>);
  private readonly fb = inject(FormBuilder);
  /** Espacio a editar (con horarios) o null para crear uno nuevo. */
  protected readonly space = inject<Space | null>(MAT_DIALOG_DATA);

  protected readonly tipos = TIPOS_ESPACIO;
  protected readonly slots = timeSlots('05:00', '23:00');
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    nombre: [this.space?.nombre ?? '', [Validators.required, Validators.maxLength(150)]],
    tipo: [(this.space?.tipo ?? 'Aula') as TipoEspacio, Validators.required],
    capacidad: [this.space?.capacidad ?? 20, [Validators.required, Validators.min(1)]],
    ubicacion: [this.space?.ubicacion ?? '', [Validators.required, Validators.maxLength(200)]],
    descripcion: [this.space?.descripcion ?? '', [Validators.required, Validators.maxLength(1000)]],
    horarioFuncionamiento: [this.space?.horarioFuncionamiento ?? '', [Validators.required, Validators.maxLength(200)]],
    disponible: [this.space?.disponible ?? true],
    horarios: this.fb.nonNullable.array(
      DIAS_SEMANA.map((dia) => {
        const h = this.space?.horarios?.find((x) => x.diaSemana === dia);
        const isNew = !this.space;
        return this.fb.nonNullable.group({
          diaSemana: dia,
          activo: h ? h.estaDisponible : isNew && dia !== 'Domingo',
          horaInicio: h ? shortTime(h.horaInicio) : dia === 'Sábado' ? '08:00' : '07:00',
          horaFin: h ? shortTime(h.horaFin) : dia === 'Sábado' ? '13:00' : '21:00',
        });
      }),
    ),
  });

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { horarios, ...data } = this.form.getRawValue();
    const invalid = horarios.find((h) => h.activo && timeToMinutes(h.horaFin) <= timeToMinutes(h.horaInicio));
    if (invalid) {
      this.error.set(`El horario del ${invalid.diaSemana} tiene la hora de fin antes de la de inicio.`);
      return;
    }
    const body: SpaceRequest = {
      ...data,
      horarios: horarios
        .filter((h) => h.activo)
        .map((h) => ({
          diaSemana: h.diaSemana,
          horaInicio: toApiTime(h.horaInicio),
          horaFin: toApiTime(h.horaFin),
          estaDisponible: true,
        })),
    };
    this.saving.set(true);
    this.error.set(null);
    const request$ = this.space ? this.spaceService.update(this.space.id, body) : this.spaceService.create(body);
    request$.subscribe({
      next: (space) => this.dialogRef.close(space),
      error: (err) => {
        this.saving.set(false);
        this.error.set(getErrorMessage(err));
      },
    });
  }
}
