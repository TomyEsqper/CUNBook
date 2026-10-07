import { TipoEspacio } from '../models/space';

const ICONS: Record<TipoEspacio, string> = {
  Aula: 'school',
  Laboratorio: 'science',
  'Sala de estudio': 'menu_book',
  Auditorio: 'theater_comedy',
  'Espacio lúdico': 'sports_esports',
};

/** Palabras del nombre que tienen un icono mas especifico que el del tipo. */
const KEYWORDS: [RegExp, string][] = [
  [/billar|juego|ping/i, 'sports_esports'],
  [/sistemas|c[oó]mputo|computador/i, 'computer'],
  [/qu[ií]mica|f[ií]sica|biolog/i, 'science'],
  [/auditorio/i, 'theater_comedy'],
];

export function spaceIcon(tipo: string, nombre = ''): string {
  return KEYWORDS.find(([pattern]) => pattern.test(nombre))?.[1] ?? ICONS[tipo as TipoEspacio] ?? 'meeting_room';
}
