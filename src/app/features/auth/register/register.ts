import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { getErrorMessage } from '../../../core/models/api-error';
import { Rol } from '../../../core/models/user';
import { AuthService } from '../../../core/services/auth';
import { NotifyService } from '../../../core/services/notify';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
}

const INSTITUTIONAL_EMAIL = /^[^\s@]+@cun\.edu\.co$/i;

type Field = 'nombre' | 'email' | 'telefono' | 'facultad' | 'password' | 'confirmPassword';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, MatProgressBarModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotifyService);
  private readonly fb = inject(FormBuilder);

  /** La API registra a todos como Estudiante; el rol solo se elige en el modo mock. */
  protected readonly canChooseRole = environment.useMocks;
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group(
    {
      nombre: ['', [Validators.required, Validators.maxLength(120)]],
      email: ['', [Validators.required, Validators.pattern(INSTITUTIONAL_EMAIL), Validators.maxLength(200)]],
      telefono: ['', [Validators.required, Validators.pattern(/^[0-9+\s-]{7,30}$/)]],
      facultad: ['', [Validators.required, Validators.maxLength(150)]],
      rol: ['Estudiante' as Rol, Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  protected readonly rol = toSignal(this.form.controls.rol.valueChanges, {
    initialValue: this.form.controls.rol.value,
  });

  protected invalid(name: Field): boolean {
    const control = this.form.controls[name];
    return control.invalid && control.touched;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { confirmPassword: _confirm, ...data } = this.form.getRawValue();
    this.loading.set(true);
    this.error.set(null);
    this.auth.register(data).subscribe({
      next: () => {
        this.notify.success('Cuenta creada correctamente.');
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.error.set(getErrorMessage(err));
        this.loading.set(false);
      },
    });
  }
}
