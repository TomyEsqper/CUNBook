import { effect, Signal, signal } from '@angular/core';

/**
 * true cuando `loading` lleva mas de `ms` activo. El backend en el plan gratuito de Render
 * se duerme y el primer request puede tardar 30-50 s; sirve para avisarle al usuario.
 */
export function slowRequest(loading: Signal<boolean>, ms = 5000): Signal<boolean> {
  const slow = signal(false);
  effect((onCleanup) => {
    if (!loading()) {
      slow.set(false);
      return;
    }
    const id = setTimeout(() => slow.set(true), ms);
    onCleanup(() => clearTimeout(id));
  });
  return slow.asReadonly();
}
