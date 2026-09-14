export type LoteQuickView =
  | "menu"
  | "ajustar-stock"
  | "registrar-perdida"
  | "editar-vencimiento"
  | "editar-costo";

export const ACCION_LABEL_LOTE: Record<
  Exclude<LoteQuickView, "menu">,
  string
> = {
  "ajustar-stock": "Ajustar Stock",
  "registrar-perdida": "Registrar Pérdida",
  "editar-vencimiento": "Modificar Vencimiento",
  "editar-costo": "Editar Costo de Entrada",
};

export const FORM_ID_LOTE: Record<
  Exclude<LoteQuickView, "menu">,
  string
> = {
  "ajustar-stock": "lote-action-ajustar-stock",
  "registrar-perdida": "lote-action-registrar-perdida",
  "editar-vencimiento": "lote-action-editar-vencimiento",
  "editar-costo": "lote-action-editar-costo",
};

export const SUBMIT_LABEL_LOTE: Record<
  Exclude<LoteQuickView, "menu">,
  string
> = {
  "ajustar-stock": "Confirmar",
  "registrar-perdida": "Confirmar",
  "editar-vencimiento": "Guardar",
  "editar-costo": "Guardar",
};