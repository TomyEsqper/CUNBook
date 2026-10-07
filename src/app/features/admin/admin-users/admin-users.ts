import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { Rol, ROLES, User } from '../../../core/models/user';
import { AuthService } from '../../../core/services/auth';
import { NotifyService } from '../../../core/services/notify';
import { UserService } from '../../../core/services/user';

@Component({
  selector: 'app-admin-users',
  imports: [
    DatePipe,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.css',
})
export class AdminUsers implements OnInit {
  private readonly userService = inject(UserService);
  private readonly notify = inject(NotifyService);
  protected readonly auth = inject(AuthService);

  protected readonly columns = ['nombre', 'email', 'facultad', 'fechaRegistro', 'rol'];
  protected readonly roles = ROLES;
  protected readonly users = signal<User[]>([]);
  protected readonly loading = signal(true);
  protected readonly search = signal('');
  protected readonly rolFilter = signal<Rol | ''>('');

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const rol = this.rolFilter();
    return this.users().filter(
      (u) =>
        (!rol || u.rol === rol) &&
        (!term || u.nombre.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)),
    );
  });

  ngOnInit(): void {
    this.userService.list().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.notify.fromError(err);
      },
    });
  }

  protected changeRole(user: User, rol: Rol): void {
    this.loading.set(true);
    this.userService.updateRole(user.id, rol).subscribe({
      next: (updated) => {
        this.users.update((list) => list.map((u) => (u.id === updated.id ? updated : u)));
        this.loading.set(false);
        this.notify.success(`${updated.nombre} ahora es ${ROLES.find((r) => r.value === rol)?.label}.`);
      },
      error: (err) => {
        this.loading.set(false);
        // Filas nuevas para que el select vuelva a mostrar el rol original.
        this.users.update((list) => list.map((u) => ({ ...u })));
        this.notify.fromError(err);
      },
    });
  }
}
