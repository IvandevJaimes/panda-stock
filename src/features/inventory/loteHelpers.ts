import { evaluateExpiry } from "../../lib/dateUtils";

export const DETALLE_DIAS_VENCER = 30;

export function estadoLoteBadge(
  fechaVence: string | null,
): { label: string; clases: string } {
  if (!fechaVence) {
    return {
      label: "Sin vencimiento",
      clases:
        "bg-slate-500/10 text-slate-400 border-slate-500/20 dark:border-slate-500/30 dark:text-slate-400",
    };
  }
  const evaluacion = evaluateExpiry(fechaVence, DETALLE_DIAS_VENCER);
  if (evaluacion?.status === "expired") {
    return {
      label: "Vencido",
      clases:
        "bg-red-500/10 text-red-500 border-red-500/20 dark:border-red-500/30 dark:text-red-400",
    };
  }
  if (evaluacion?.status === "expiring_soon") {
    return {
      label: "Por vencer",
      clases:
        "bg-amber-500/10 text-amber-500 border-amber-500/20 dark:border-amber-500/30 dark:text-amber-400",
    };
  }
  return {
    label: "Vigente",
    clases:
      "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 dark:border-emerald-500/30 dark:text-emerald-400",
  };
}

export function tintPanelLote(fechaVence: string | null): string {
  if (!fechaVence) {
    return "border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40";
  }
  const evaluacion = evaluateExpiry(fechaVence, DETALLE_DIAS_VENCER);
  if (evaluacion?.status === "expired") {
    return "border-red-500/25 bg-red-500/5 dark:border-red-900/50 dark:bg-red-950/25";
  }
  if (evaluacion?.status === "expiring_soon") {
    return "border-amber-500/25 bg-amber-500/5 dark:border-amber-900/50 dark:bg-amber-950/25";
  }
  return "border-emerald-500/25 bg-emerald-500/5 dark:border-emerald-900/50 dark:bg-emerald-950/25";
}

/** Texto relativo de vencimiento ("Vence en X días" / "Vencido hace X días") con color según estado. */
export function relativeTextVencimiento(
  fechaVence: string | null,
): { texto: string; clases: string } | null {
  if (!fechaVence) return null;
  const evaluacion = evaluateExpiry(fechaVence, DETALLE_DIAS_VENCER);
  if (!evaluacion) return null;
  const clases =
    evaluacion.status === "expired"
      ? "text-red-600 dark:text-red-400"
      : evaluacion.status === "expiring_soon"
        ? "text-amber-600 dark:text-amber-400"
        : "text-emerald-600 dark:text-emerald-400";
  return { texto: evaluacion.relativeText, clases };
}