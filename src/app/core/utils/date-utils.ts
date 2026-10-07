import { DiaSemana, DIAS_SEMANA } from '../models/space';

/** Date -> "yyyy-MM-dd" en hora local. */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** "yyyy-MM-dd" -> Date local (evita el desfase UTC de new Date(string)). */
export function fromIsoDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** "08:00" o "08:00:00" -> "08:00:00" (formato TimeSpan de ASP.NET). */
export function toApiTime(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

/** "08:00:00" -> "08:00". */
export function shortTime(value: string): string {
  return value?.slice(0, 5) ?? '';
}

export function timeToMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function dayOfWeek(date: Date): DiaSemana {
  return DIAS_SEMANA[(date.getDay() + 6) % 7];
}

export function combineDateTime(fecha: string, hora: string): Date {
  const date = fromIsoDate(fecha);
  const [h, m] = hora.split(':').map(Number);
  date.setHours(h, m, 0, 0);
  return date;
}

export function startOfWeek(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Franjas de 30 minutos entre dos horas, en formato "HH:mm". */
export function timeSlots(from = '06:00', to = '22:00', step = 30): string[] {
  const slots: string[] = [];
  for (let t = timeToMinutes(from); t <= timeToMinutes(to); t += step) {
    slots.push(minutesToTime(t));
  }
  return slots;
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return timeToMinutes(aStart) < timeToMinutes(bEnd) && timeToMinutes(bStart) < timeToMinutes(aEnd);
}
