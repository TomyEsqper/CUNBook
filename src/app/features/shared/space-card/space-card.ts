import { Component, computed, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Space } from '../../../core/models/space';
import { AuthService } from '../../../core/services/auth';
import { spaceIcon } from '../../../core/utils/space-icons';

@Component({
  selector: 'app-space-card',
  imports: [RouterLink, MatIconModule],
  templateUrl: './space-card.html',
  styleUrl: './space-card.css',
})
export class SpaceCard {
  protected readonly auth = inject(AuthService);
  readonly space = input.required<Space>();
  /** Muestra ubicacion, capacidad y el boton Reservar (listado completo). */
  readonly detailed = input(false);

  protected readonly icon = computed(() => spaceIcon(this.space().tipo, this.space().nombre));
}
