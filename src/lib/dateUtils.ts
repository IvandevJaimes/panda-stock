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
