import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { DEMO_ACCOUNTS, DemoAccount } from '../../../core/mocks/mock-data';
import { getErrorMessage } from '../../../core/models/api-error';
import { AuthService } from '../../../core/services/auth';
import { NotifyService } from '../../../core/services/notify';

/** Cuenta que crea el DbSeeder del backend. */
const API_DEMO_ACCOUNTS: DemoAccount[] = [
  { email: 'admin@cun.edu.co', label: 'Administrador', password: 'AdminCun2026*' },
];

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, MatIconModule, MatProgressBarModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotifyService);
  private readonly fb = inject(FormBuilder);

  /** Query param que deja el authGuard para volver a la pagina solicitada. */
  readonly returnUrl = input<string>();

  protected readonly demoAccounts = environment.useMocks ? DEMO_ACCOUNTS : API_DEMO_ACCOUNTS;
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly hidePassword = signal(true);
  protected readonly recoverMode = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected readonly recoverForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected invalid(name: 'email' | 'password'): boolean {
    const control = this.form.controls[name];
    return control.invalid && control.touched;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: (res) => {
        this.notify.success(`Bienvenido, ${res.user.nombre}`);
        this.router.navigateByUrl(this.returnUrl() || '/home');
      },
      error: (err) => {
        this.error.set(getErrorMessage(err));
        this.loading.set(false);
      },
    });
  }

  protected useDemo({ email, password }: DemoAccount): void {
    this.form.setValue({ email, password });
    this.submit();
  }

  protected recover(): void {
    if (this.recoverForm.invalid) {
      this.recoverForm.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.auth.forgotPassword(this.recoverForm.getRawValue().email).subscribe({
      next: () => {
        this.loading.set(false);
        this.recoverMode.set(false);
        this.notify.success('Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.');
      },
      error: (err) => {
        this.loading.set(false);
        this.notify.fromError(err);
      },
    });
  }
}
