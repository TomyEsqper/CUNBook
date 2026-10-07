import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { CunLogo } from '../cun-logo/cun-logo';
import { SiteFooter } from '../site-footer/site-footer';

@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CunLogo, SiteFooter],
  templateUrl: './public-layout.html',
  styleUrl: './public-layout.css',
})
export class PublicLayout {
  private readonly router = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** En la pantalla de login se ofrece registrarse y viceversa. */
  protected readonly cta = computed(() =>
    this.url().startsWith('/register')
      ? { label: 'Iniciar Sesión', link: '/login' }
      : { label: 'Registrarse', link: '/register' },
  );
}
