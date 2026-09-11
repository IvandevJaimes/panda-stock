import { useEffect, useState } from "react";
import {
  Barcode,
  ChevronRight,
  DollarSign,
  Layers,
  MinusCircle,
  Pencil,
  Plus,
  SlidersHorizontal,
  Tags,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { cn } from "../../lib/cn";
import { lotesService } from "../../services/lotes.service";
import type { Lote, Producto } from "../../../electron/db/types";

export interface ProductQuickActionsModalProps {
  isOpen: boolean;
  product: Producto | null;
  marcaNombre: string;
  categoriaNombre: string;
  onClose: () => void;
  onFullEdit: () => void;
  onOpenLotes: () => void;
}

function formatearCodigo(valor: string | null): string {
  if (!valor) return "—";
  const partes = valor.split(",").map((c) => c.trim()).filter(Boolean);
  return partes.length > 1 ? `${partes[0]} +${partes.length - 1}` : partes[0] ?? "—";
}

function formatearPrecio(valor: number): string {
  return `$${valor.toFixed(2)}`;
}

type AccionProducto = {
  id: string;
  icono: LucideIcon;
  titulo: string;
  descripcion: string;
  tintClases: string;
  onSelect: () => void;
};

const ACCIONES_PRODUCTO: AccionProducto[] = [
  {
    id: "precio-venta",
    icono: DollarSign,
    titulo: "Modificar Precio de Venta",
    descripcion: "Editar solo el precio unitario de venta.",
    tintClases: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    onSelect: () => toast.info("Edición de precio de venta en desarrollo"),
  },
  {
    id: "editar-codigo",
    icono: Barcode,
    titulo: "Editar Código",
    descripcion: "Cambiar código interno o códigos de barras.",
    tintClases: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    onSelect: () => toast.info("Edición de código en desarrollo"),
  },
  {
    id: "variante-detalle",
    icono: Tags,
    titulo: "Editar Variante / Detalle",
    descripcion: "Modificar la variante o detalle del producto.",
    tintClases: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    onSelect: () => toast.info("Edición de variante en desarrollo"),
  },
];

export function ProductQuickActionsModal({
  isOpen,
  product,
  marcaNombre,
  categoriaNombre,
  onClose,
  onFullEdit,
  onOpenLotes,
}: ProductQuickActionsModalProps) {
  const [lotes, setLotes] = useState<Lote[] | null>(null);

  // Los lotes se cargan al abrir el modal. null = cargando; los setState viven
  // en callbacks asíncronos (.then/.catch), respetando react-hooks/set-state-in-effect.
  useEffect(() => {
    if (!isOpen || !product) return;
    let activo = true;

    void lotesService
      .getByProducto(product.id)
      .then((data) => {
        if (!activo) return;
        setLotes(data);
      })
      .catch(() => {
        if (!activo) return;
        setLotes([]);
      });

    return () => {
      activo = false;
    };
  }, [isOpen, product]);

  const loteActivo = lotes
    ? (lotes.find((lote) => lote.cantidadActual > 0) ?? lotes[0] ?? null)
    : null;
  const loteIdentidad = loteActivo
    ? (loteActivo.numeroLote ?? `Lote #${loteActivo.id}`)
    : null;

  const precioMayoreo =
    product && product.precioVenta > 0 ? product.precioVenta * 0.9 : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      title="Acciones Rápidas"
      headerIcon={<Zap className="h-4 w-4" aria-hidden />}
    >
      {product && (
        <div className="flex flex-col">
          {/* ── Encabezado: nombre, variante, marca, categoría y código ── */}
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {product.nombre}
              {product.variante && (
                <span className="ml-1.5 font-normal text-slate-400 dark:text-slate-500">
                  · {product.variante}
                </span>
              )}
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              {marcaNombre && (
                <>
                  <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                    {marcaNombre}
                  </span>
                  <span
                    className="text-slate-300 dark:text-slate-600"
                    aria-hidden
                  >
                    ·
                  </span>
                </>
              )}
              {categoriaNombre && (
                <>
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {categoriaNombre}
                  </span>
                  <span
                    className="text-slate-300 dark:text-slate-600"
                    aria-hidden
                  >
                    ·
                  </span>
                </>
              )}
              <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
                {formatearCodigo(product.codigoInterno || product.codigosBarras)}
              </span>
            </div>

            {/* ── Métricas rápidas del producto ── */}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-100 pt-2 dark:border-slate-800">
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                Precio{" "}
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatearPrecio(product.precioVenta)}
                </span>
                {precioMayoreo !== null && (
                  <span className="ml-1 font-normal text-slate-400 dark:text-slate-500">
                    / {formatearPrecio(precioMayoreo)} mayoreo
                  </span>
                )}
              </span>
  
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                Stock{" "}
                <span
                  className={cn(
                    "font-semibold",
                    product.stockActual <= 0
                      ? "text-red-600 dark:text-red-400"
                      : product.stockActual <= product.stockMinimo
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-emerald-600 dark:text-emerald-400",
                  )}
                >
                  {product.stockActual}
                </span>
                {product.stockMinimo > 0 && (
                  <span className="ml-1 font-normal text-slate-400 dark:text-slate-500">
                    Mín. {product.stockMinimo}
                  </span>
                )}
              </span>
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                Lote{" "}
                {lotes === null ? (
                  <span className="font-semibold text-slate-500 dark:text-slate-400">
                    cargando…
                  </span>
                ) : (
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                    {loteIdentidad ?? "Sin lote"}
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* ── Barra de operaciones de stock ── */}
          <div className=" grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() =>
                toast.info("Agregar inventario en desarrollo")
              }
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-2 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Agregar Inventario
            </button>
            <button
              type="button"
              onClick={() =>
                toast.info("Ajuste de stock en desarrollo")
              }
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
              Ajustar stock
            </button>
            <button
              type="button"
              onClick={() =>
                toast.info("Registrar pérdida en desarrollo")
              }
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-red-600 px-2 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-red-500"
            >
              <MinusCircle className="h-3.5 w-3.5" aria-hidden />
              Registrar pérdida
            </button>
          </div>

          <hr className="my-4 border-slate-200 dark:border-slate-800" />

          {/* ── Acciones directas del producto (sin lote) ── */}
          <div className="flex flex-col gap-3">
            {ACCIONES_PRODUCTO.map((accion) => {
              const Icono = accion.icono;
              return (
                <button
                  key={accion.id}
                  type="button"
                  onClick={accion.onSelect}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition-colors hover:border-emerald-500/50 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                >
                  <span
                    className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                      accion.tintClases,
                    )}
                  >
                    <Icono
                      className="h-4 w-4"
                      strokeWidth={2}
                      aria-hidden
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {accion.titulo}
                    </span>
                    <span className="block text-xs font-medium text-slate-400 dark:text-slate-500">
                      {accion.descripcion}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <hr className="my-4 border-slate-200 dark:border-slate-800" />

          {/* ── Edición completa del producto ── */}
          <button
            type="button"
            onClick={onFullEdit}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Pencil className="h-4 w-4" aria-hidden />
            Editar toda la información del producto (Nombre, Categoría, etc.)
          </button>

          {/* ── Acceso a la gestión de lotes (al fondo) ── */}
          <button
            type="button"
            onClick={onOpenLotes}
            className="mt-3 flex w-full cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-sm transition-all hover:bg-emerald-50 hover:text-emerald-800 dark:border-slate-700 dark:bg-slate-800/80 dark:text-emerald-400 dark:hover:bg-slate-700/80 dark:hover:text-emerald-300"
          >
            <span className="flex items-center gap-2">
              <Layers className="h-4 w-4" aria-hidden />
              Gestionar / Editar Lotes
            </span>
            <span className="flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors dark:text-slate-400">
              Ver vencimientos y partidas
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </span>
          </button>

          <div className="mt-4 flex justify-end">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}