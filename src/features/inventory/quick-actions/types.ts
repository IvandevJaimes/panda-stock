export type QuickActionView =
  | "menu"
  | "agregar-inventario"
  | "ajustar-stock"
  | "registrar-perdida"
  | "precio-venta"
  | "editar-codigo"
  | "variante-detalle"
  | "stock-minimo"
  | "editar-producto";

export const ACCION_LABEL: Record<Exclude<QuickActionView, "menu">, string> = {
  "agregar-inventario": "Agregar Inventario",
  "ajustar-stock": "Ajustar Stock",
  "registrar-perdida": "Registrar merma",
  "precio-venta": "Modificar Precio de Venta",
  "editar-codigo": "Editar Código",
  "variante-detalle": "Editar Variante / Detalle",
  "stock-minimo": "Stock mínimo",
  "editar-producto": "Editar Producto",
};

export const noSpinnersClass =
  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none outline-none focus:outline-none focus:ring-1 focus:ring-emerald-500/50";

export const FORM_ID: Record<Exclude<QuickActionView, "menu">, string> = {
  "agregar-inventario": "quick-action-agregar-inventario",
  "ajustar-stock": "quick-action-ajustar-stock",
  "registrar-perdida": "quick-action-registrar-perdida",
  "precio-venta": "quick-action-precio-venta",
  "editar-codigo": "quick-action-editar-codigo",
  "variante-detalle": "quick-action-variante-detalle",
  "stock-minimo": "quick-action-stock-minimo",
  "editar-producto": "quick-action-editar-producto",
};

export const SUBMIT_LABEL: Record<Exclude<QuickActionView, "menu">, string> = {
  "agregar-inventario": "Confirmar",
  "ajustar-stock": "Confirmar",
  "registrar-perdida": "Confirmar",
  "precio-venta": "Guardar",
  "editar-codigo": "Guardar",
  "variante-detalle": "Guardar",
  "stock-minimo": "Guardar",
  "editar-producto": "Guardar cambios",
};