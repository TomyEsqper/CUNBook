import { Space, SpaceFilter } from '../models/space';

export function filterSpaces(spaces: Space[], filter: SpaceFilter = {}): Space[] {
  const search = filter.search?.trim().toLowerCase();
  return spaces.filter(
    (s) =>
      (filter.incluirInactivos || s.disponible) &&
      (!filter.tipo || s.tipo === filter.tipo) &&
      (!filter.capacidadMin || s.capacidad >= filter.capacidadMin) &&
      (!search ||
        s.nombre.toLowerCase().includes(search) ||
        s.ubicacion.toLowerCase().includes(search) ||
        s.descripcion.toLowerCase().includes(search)),
  );
}
