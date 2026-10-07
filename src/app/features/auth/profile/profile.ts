import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ROLES } from '../../../core/models/user';
import { AuthService } from '../../../core/services/auth';
import { NotifyService } from '../../../core/services/notify';
import { UserService } from '../../../core/services/user';

@Component({
  selector: 'app-profile',
  imports: [
    ReactiveFormsModule,
    DatePipe,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  private readonly users = inject(UserService);
  private readonly notify = inject(NotifyService);
  private readonly fb = inject(FormBuilder);
  protected readonly auth = inject(AuthService);

  protected readonly loading = signal(false);
  protected readonly rolLabel = computed(
    () => ROLES.find((r) => r.value === this.auth.user()?.rol)?.label ?? '',
  );

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    telefono: ['', [Validators.required, Validators.pattern(/^[0-9+\s-]{7,30}$/)]],
    facultad: ['', [Validators.required, Validators.maxLength(150)]],
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.users.me().subscribe({
      next: (user) => {
        this.form.reset({ nombre: user.nombre, telefono: user.telefono, facultad: user.facultad });
        this.auth.updateStoredUser(user);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.notify.fromError(err);
      },
    });
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.users.updateProfile(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        this.form.markAsPristine();
        this.notify.success('Perfil actualizado.');
      },
      error: (err) => {
        this.loading.set(false);
        this.notify.fromError(err);
      },
    });
  }
}
