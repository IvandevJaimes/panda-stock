/**
 * Duración transcurrida como `HH:MM:SS`.
 *
 * Las horas no tienen tope: un turno de 26 horas tiene que leerse `26` y no `02`,
 * porque el número grande es justamente la señal de que el turno se pasó de largo
 * y encotrarlo a `02` lo haría pasar por algo que empieza a las dos.
 *
 * `ahora` entra por parámetro para que el cálculo sea testeable sin reloj falso.
 */
export function formatearDuracionTranscurrida(
  desdeIso: string | null | undefined,
  ahora: number,
): string {
  if (!desdeIso) return '—'
  const desde = new Date(desdeIso).getTime()
  if (Number.isNaN(desde)) return '—'

  // Se clampa en 0 porque un reloj del sistema atrasado, o una fecha de apertura
  // cargada en el futuro, darían un negativo con signo de reloj: "−1:59:59".
  const totalSegundos = Math.max(0, Math.floor((ahora - desde) / 1000))
  const horas = Math.floor(totalSegundos / 3600)
  const minutos = Math.floor((totalSegundos % 3600) / 60)
  const segundos = totalSegundos % 60

  return `${dosDigitos(horas)}:${dosDigitos(minutos)}:${dosDigitos(segundos)}`
}

function dosDigitos(valor: number): string {
  return String(valor).padStart(2, '0')
}

export interface ExpiryEvaluation {
  status: 'expired' | 'expiring_soon' | 'normal';
  daysDiff: number;
  relativeText: string;
  formattedDate: string;
}

export function evaluateExpiry(
  dateStr?: string,
  warningDaysThreshold = 14,
): ExpiryEvaluation | null {
  if (!dateStr) return null;

  // 1. Parseo seguro sin problemas de zona horaria UTC
  let year: number, month: number, day: number;

  if (dateStr.includes('/')) {
    const parts = dateStr.split('/').map(Number);
    day = parts[0];
    month = parts[1] - 1;
    year = parts[2];
  } else if (dateStr.includes('-')) {
    const parts = dateStr.split('-').map(Number);
    year = parts[0];
    month = parts[1] - 1;
    day = parts[2];
  } else {
    return null;
  }

  // 2. Normalización exacta a medianoche local
  const targetDate = new Date(year, month, day, 0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 3. Diferencia exacta en días
  const diffTime = targetDate.getTime() - today.getTime();
  const daysDiff = Math.round(diffTime / (1000 * 60 * 60 * 24));

  // 4. Regla estricta y sincronizada
  let status: 'expired' | 'expiring_soon' | 'normal';
  let relativeText: string;

  if (daysDiff < 0) {
    status = 'expired';
    relativeText =
      daysDiff === -1 ? 'Vencido hace 1 día' : `Vencido hace ${Math.abs(daysDiff)} días`;
  } else if (daysDiff === 0) {
    status = 'expired';
    relativeText = 'Vence hoy';
  } else if (daysDiff <= warningDaysThreshold) {
    status = 'expiring_soon';
    relativeText = daysDiff === 1 ? 'Vence mañana' : `Vence en ${daysDiff} días`;
  } else {
    status = 'normal';
    relativeText = `Vence en ${daysDiff} días`;
  }

  const formattedDay = String(day).padStart(2, '0');
  const formattedMonth = String(month + 1).padStart(2, '0');
  const formattedDate = `${formattedDay}/${formattedMonth}/${year}`;

  return {
    status,
    daysDiff,
    relativeText,
    formattedDate,
  };
}
