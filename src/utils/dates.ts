import { parse, format, isValid } from "date-fns";

/** Formatea una fecha ISO "yyyy-MM-dd" al formato de display deseado.
 *  Si el string está vacío o es inválido, devuelve "".
 */
export function formatISODate(
  iso: string | null | undefined,
  fmt: string = "dd/MM/yyyy",
): string {
  if (!iso) return "";
  const d = parse(iso, "yyyy-MM-dd", new Date());
  return isValid(d) ? format(d, fmt) : "";
}

/** Parsea un string ISO "yyyy-MM-dd" a Date (local timezone).
 *  Devuelve null si es inválido.
 */
export function parseISO(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = parse(iso, "yyyy-MM-dd", new Date());
  return isValid(d) ? d : null;
}

/** Parsea un string display "dd/MM/yyyy" a Date (local timezone). */
export function parseDisplayDate(str: string): Date | null {
  if (!str || str.length !== 10) return null;
  const d = parse(str, "dd/MM/yyyy", new Date());
  return isValid(d) ? d : null;
}
