import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpRight,
  Barcode,
  Boxes,
  CalendarDays,
  CheckCircle2,
  Clock,
  DollarSign,
  History,
  Info,
  Layers,
  Loader2,
  PackageX,
  Pencil,
  Plus,
  RotateCcw,
  ShoppingCart,
  Trash2,
  TrendingDown,
  TrendingUp,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { TabsModal, type TabsModalTab } from "../../components/ui/TabsModal";
import { Button } from "../../components/ui/Button";
import { EmptyStateCompact } from "../../components/ui/EmptyStateCompact";
import { ProductImageBox } from "../../components/ui/ProductImageBox";
import { cn } from "../../lib/cn";
import { evaluateExpiry } from "../../lib/dateUtils";
import { lotesService } from "../../services/lotes.service";
import { movimientosService } from "../../services/movimientos.service";
import { ConfirmarPerdidaModal } from "./ConfirmarPerdidaModal";
import { ToggleActivoProducto } from "./ToggleActivoProducto";
import {
  DETALLE_DIAS_VENCER,
  esLoteVencido,
  esStockBajo,
  estadoLoteActivoBadge,
  getLoteActivo,
  relativeTextVencimiento,
  tintPanelLoteActivo,
} from "./loteHelpers";
import type {
  Lote,
  MovimientoStock,
  Producto,
  TipoMovimientoStock,
} from "../../../electron/db/types";

// Preparación para el historial de auditoría (kardex) de la sección Movimientos:
// interface MovimientoDetalle {
//   fecha: string;
//   tipo: "entrada" | "salida" | "ajuste";
//   cantidad: number;
//   motivo?: string;
// }

export interface ProductDetailModalProps {
  isOpen: boolean;
  product: Producto;
  marcaNombre: string;
  categoriaNombre: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  /** Abre el modal independiente de gestión de lotes (cierra el detalle) */
  onOpenLotes?: () => void;
  /** Abre el modal de gestión de lotes con el formulario de agregar inventario listo */
  onAgregarInventario?: () => void;
  /** Se invoca cuando una mutación en lotes/acciones rápidas altera datos del producto */
  onMutated?: () => void;
}

const MOVIMIENTO_CONFIG: Record<
  TipoMovimientoStock,
  {
    label: string;
    signo: 1 | -1;
    icon: LucideIcon;
    iconClases: string;
    badgeClases: string;
    cantidadClases: string;
  }
> = {
  entrada: {
    label: "Entrada",
    signo: 1,
    icon: ArrowDownLeft,
    iconClases: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    badgeClases:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
    cantidadClases: "text-emerald-600 dark:text-emerald-400",
  },
  venta: {
    label: "Venta",
    signo: -1,
    icon: ShoppingCart,
    iconClases: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    badgeClases:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-300",
    cantidadClases: "text-sky-600 dark:text-sky-400",
  },
  ajuste_positivo: {
    label: "Ajuste positivo",
    signo: 1,
    icon: ArrowUpRight,
    iconClases: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    badgeClases:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300",
    cantidadClases: "text-amber-600 dark:text-amber-400",
  },
  ajuste_negativo: {
    label: "Ajuste negativo",
    signo: -1,
    icon: ArrowDownRight,
    iconClases: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    badgeClases:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300",
    cantidadClases: "text-amber-600 dark:text-amber-400",
  },
  merma: {
    label: "Merma",
    signo: -1,
    icon: PackageX,
    iconClases: "bg-red-500/10 text-red-600 dark:text-red-400",
    badgeClases:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300",
    cantidadClases: "text-red-600 dark:text-red-400",
  },
  devolucion: {
    label: "Devolución",
    signo: 1,
    icon: RotateCcw,
    iconClases: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    badgeClases:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-300",
    cantidadClases: "text-violet-600 dark:text-violet-400",
  },
};

function formatearPrecio(valor: number): string {
  return `$${valor.toFixed(2)}`;
}

function formatearFecha(iso?: string | null): string {
  if (!iso) return "—";
  const partes = iso.split("-");
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  return iso;
}

function tintSubheader(
  fechaVence: string | null,
  stockBajo: boolean,
): string {
  if (!fechaVence) {
    return stockBajo
      ? "border-amber-500/20 bg-amber-500/10 dark:border-amber-500/40 dark:bg-amber-950/30"
      : "";
  }
  const evaluacion = evaluateExpiry(fechaVence, DETALLE_DIAS_VENCER);
  if (evaluacion?.status === "expired") {
    return "border-red-500/20 bg-red-500/10 dark:border-red-500/40 dark:bg-red-950/40";
  }
  if (evaluacion?.status === "expiring_soon" || stockBajo) {
    return "border-amber-500/20 bg-amber-500/10 dark:border-amber-500/40 dark:bg-amber-950/30";
  }
  return "";
}

function formatearFechaHora(iso?: string | null): string {
  if (!iso) return "—";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "—";
  return fecha.toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function Dato({
  etiqueta,
  children,
  mono = false,
  className,
}: {
  etiqueta: string;
  children: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-xs font-medium text-slate-400 dark:text-slate-500">
        {etiqueta}
      </dt>
      <dd
        className={cn(
          "break-words text-sm font-semibold text-slate-800 dark:text-slate-100",
          mono && "select-all font-mono tabular-nums",
          className,
        )}
      >
        {children}
      </dd>
    </div>
  );
}

function SectionTitle({
  icon: Icono,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <h4 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
      <Icono className="h-4 w-4" strokeWidth={2} aria-hidden />
      {children}
    </h4>
  );
}

function EstadoStock({
  stock,
  stockMinimo,
}: {
  stock: number;
  stockMinimo: number;
}) {
  if (stock <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400">
        <XCircle className="h-4 w-4" aria-hidden /> Sin stock
      </span>
    );
  }
  if (stock < stockMinimo) {
    return (
      <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
        <AlertTriangle className="h-4 w-4" aria-hidden /> Stock bajo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
      <CheckCircle2 className="h-4 w-4" aria-hidden /> Óptimo
    </span>
  );
}

export function ProductDetailModal({
  isOpen,
  product,
  marcaNombre,
  categoriaNombre,
  onClose,
  onEdit,
  onDelete,
  onOpenLotes,
  onAgregarInventario,
  onMutated,
}: ProductDetailModalProps) {
  const [lotes, setLotes] = useState<Lote[] | null>(null);
  const [perdidaSeleccion, setPerdidaSeleccion] = useState<Lote | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoStock[] | null>(
    null,
  );

  // Los lotes y movimientos se cargan al abrir el modal. null = cargando; los
  // setState viven en callbacks asíncronos (.then/.catch), respetando
  // react-hooks/set-state-in-effect.
  useEffect(() => {
    if (!isOpen) return;
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

    void movimientosService
      .getAll({ productoId: product.id })
      .then((data) => {
        if (!activo) return;
        setMovimientos(data);
      })
      .catch(() => {
        if (!activo) return;
        setMovimientos([]);
      });

    return () => {
      activo = false;
    };
  }, [isOpen, product.id]);

  // Nota: los setState viven en callbacks asíncronos (.then/.catch), respetando
  // react-hooks/set-state-in-effect (ver useEffect de carga de lotes más abajo).

  const codigosBarras = (product.codigosBarras ?? "")
    .split(",")
    .map((codigo) => codigo.trim())
    .filter(Boolean);
  const precioMayoreo =
    product.precioVenta > 0 ? product.precioVenta * 0.9 : null;
  const margenDelta = product.precioVenta - (product.costo ?? 0);
  const margenPorcentaje =
    (product.costo ?? 0) > 0
      ? (margenDelta / (product.costo ?? 0)) * 100
      : null;
  const margenEsGanancia = margenDelta > 0;

  const loteActivo = getLoteActivo(lotes);
  const loteIdentidad = loteActivo
    ? (loteActivo.numeroLote ?? `Lote #${loteActivo.id}`)
    : null;
  const productoStockBajo = esStockBajo(product.stockActual, product.stockMinimo);

  const handlePerdidaSuccess = () => {
    setPerdidaSeleccion(null);
    onMutated?.();
    void lotesService
      .getByProducto(product.id)
      .then(setLotes)
      .catch(() => setLotes([]));
    void movimientosService
      .getAll({ productoId: product.id })
      .then(setMovimientos)
      .catch(() => setMovimientos([]));
  };

  const pestanas: TabsModalTab[] = [
    {
      id: "informacion",
      label: "Información",
      icon: Info,
      content: (
        <div className="flex flex-col divide-y divide-slate-200 dark:divide-slate-800">
          {/* Cabecera del producto */}
          <div className="flex items-center gap-4 pb-4">
            <ProductImageBox
              productoId={product.id}
              nombre={product.nombre}
              imgPath={product.imgPath}
              onChanged={onMutated}
              className="h-24 w-24 sm:h-28 sm:w-28"
            />
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 md:text-lg">
                {product.nombre}
                {product.variante && (
                  <span className="ml-2 text-sm font-medium text-slate-400 dark:text-slate-500">
                    · {product.variante}
                  </span>
                )}
              </h3>
            </div>
          </div>

          {/* Sección 1: General */}
          <section className="py-4">
            <SectionTitle icon={Info}>General</SectionTitle>
            <dl className="grid grid-cols-2 gap-y-3 gap-x-6">
              <Dato etiqueta="Nombre">{product.nombre}</Dato>
              <Dato etiqueta="Categoría">
                {categoriaNombre || "Sin categoría"}
              </Dato>
              <Dato etiqueta="Marca">{marcaNombre || "—"}</Dato>
              <Dato etiqueta="Variante / Detalle">
                {product.variante || "—"}
              </Dato>
            </dl>
          </section>

          {/* Sección 2: Identificación (código interno y códigos de barra) */}
          {(product.codigoInterno || codigosBarras.length > 0) && (
            <section className="py-4">
              <SectionTitle icon={Barcode}>
                Identificación y códigos
              </SectionTitle>
              <dl className="grid grid-cols-2 gap-y-3 gap-x-6">
                {product.codigoInterno && (
                  <Dato etiqueta="Código interno" mono>
                    {product.codigoInterno}
                  </Dato>
                )}
                {codigosBarras.length > 0 && (
                  <Dato etiqueta="Códigos de barra" mono>
                    {codigosBarras.join(", ")}
                  </Dato>
                )}
              </dl>
            </section>
          )}

          {/* Sección 3: Stock */}
          <section className="py-4">
            <SectionTitle icon={Boxes}>Stock</SectionTitle>
            <dl className="grid grid-cols-2 gap-y-3 gap-x-6">
              <Dato
                etiqueta="Stock actual"
                className={cn(
                  "tabular-nums",
                  product.stockActual < product.stockMinimo &&
                    "text-red-600 dark:text-red-400",
                )}
              >
                {product.stockActual} und
              </Dato>
              <Dato etiqueta="Stock mínimo">
                {product.stockMinimo > 0 ? product.stockMinimo : "Sin mínimo"}
              </Dato>
              <Dato etiqueta="Estado de stock">
                <EstadoStock
                  stock={product.stockActual}
                  stockMinimo={product.stockMinimo}
                />
              </Dato>
            </dl>
          </section>

          {/* Sección: Lote activo y vencimiento */}
          <section className="py-4">
            <div className="flex justify-between items-center text-center">
              <SectionTitle icon={Layers}>
                Lote activo y vencimiento
              </SectionTitle>
              {onOpenLotes && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Layers className="h-4 w-4" aria-hidden />}
                  className="mb-3"
                  onClick={onOpenLotes}
                >
                  Gestionar lotes
                </Button>
              )}
            </div>

            {loteActivo ? (
              <div
                className={cn(
                  "rounded-xl border p-4 transition-colors",
                  tintPanelLoteActivo(loteActivo.fechaVence, productoStockBajo),
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/70 text-slate-500 dark:bg-slate-800/70 dark:text-slate-300">
                      <Boxes className="h-5 w-5" strokeWidth={2} aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
Lote activo
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                        {loteActivo.cantidadActual} und
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {(() => {
                      const badge = estadoLoteActivoBadge(
                        loteActivo.fechaVence,
                        productoStockBajo,
                      );
                      return (
                        <span
                          className={cn(
                            "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                            badge.clases,
                          )}
                        >
                          {badge.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200/60 pt-3 dark:border-slate-800">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Vencimiento
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                      {loteActivo.fechaVence
                        ? formatearFecha(loteActivo.fechaVence)
                        : "Sin vencimiento"}
                    </span>
                    {loteActivo.fechaVence &&
                      (() => {
                        const relativo = relativeTextVencimiento(
                          loteActivo.fechaVence,
                        );
                        return relativo ? (
                          <span
                            className={cn(
                              "text-[11px] font-semibold",
                              relativo.clases,
                            )}
                          >
                            {relativo.texto}
                          </span>
                        ) : null;
                      })()}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Disponible en el lote
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                      {loteActivo.cantidadActual}
                    </span>
                  </div>
                </div>

                {esLoteVencido(loteActivo.fechaVence) && (
                  <div className="mt-3 border-t border-slate-200/60 pt-3 dark:border-slate-800">
                    <Button
                      variant="danger"
                      size="sm"
                      className="w-full"
                      icon={<PackageX className="h-3.5 w-3.5" aria-hidden />}
                      onClick={() => setPerdidaSeleccion(loteActivo)}
                    >
                      Confirmar pérdida
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-start gap-1 rounded-xl border border-dashed border-slate-200 bg-slate-50/40 p-4 dark:border-slate-700/60 dark:bg-slate-900/20">
                {lotes !== null && lotes.length === 0 ? (
                  <>
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-red-600 dark:text-red-400">
                      <Boxes className="h-4 w-4" aria-hidden />
                      Sin stock
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      Este producto todavía no tiene inventario cargado.
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-red-600 dark:text-red-400">
                      <PackageX className="h-4 w-4" aria-hidden />
                      Stock agotado
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      Todos los lotes se agotaron. Agregá inventario para
                      reponer stock.
                    </span>
                  </>
                )}
                <div className="mt-2 flex w-full gap-2">
                  {onAgregarInventario && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Plus className="h-4 w-4" aria-hidden />}
                      onClick={onAgregarInventario}
                      className="w-full"
                    >
                      Agregar inventario
                    </Button>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Sección 4: Precios y costos */}
          <section className="py-4">
            <SectionTitle icon={DollarSign}>Precios y costos</SectionTitle>
            <dl className="grid grid-cols-3 gap-y-3 gap-x-6">
              <Dato etiqueta="Costo unitario" className="tabular-nums">
                {formatearPrecio(product.costo)}
              </Dato>
              <Dato
                etiqueta="Precio de venta"
                className={cn(
                  "text-base font-bold",
                  margenEsGanancia
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400",
                )}
              >
                {formatearPrecio(product.precioVenta)}
              </Dato>
              <Dato etiqueta="Precio mayoreo" className="tabular-nums">
                {precioMayoreo !== null ? formatearPrecio(precioMayoreo) : "—"}
              </Dato>
              <Dato etiqueta="Valor del inventario">
                {formatearPrecio(product.stockActual * (product.costo ?? 0))}
              </Dato>
              <Dato
                etiqueta="Margen de ganancia"
                className={cn(
                  "tabular-nums",
                  margenEsGanancia
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400",
                )}
              >
                <span className="inline-flex items-center gap-1">
                  {margenEsGanancia ? (
                    <TrendingUp
                      className="h-3.5 w-3.5 shrink-0 text-emerald-500 dark:text-emerald-400"
                      aria-hidden
                    />
                  ) : (
                    <TrendingDown
                      className="h-3.5 w-3.5 shrink-0 text-red-500 dark:text-red-400"
                      aria-hidden
                    />
                  )}
                  {margenPorcentaje !== null
                    ? `${margenPorcentaje.toFixed(1).replace(/\.0$/, "")}%`
                    : "—"}
                  {" · "}
                  {margenDelta > 0 ? "+" : ""}
                  {formatearPrecio(margenDelta)}
                </span>
              </Dato>
            </dl>
            <p className="mt-2 text-[11px] font-medium text-slate-400 dark:text-slate-500">
              Mayoreo derivado: 10% de descuento desde 3 unidades.
            </p>

          </section>

          {/* Sección 5: Auditoría */}
          <section className="py-4">
            <SectionTitle icon={Clock}>Auditoría</SectionTitle>
            <dl className="grid grid-cols-2 gap-y-3 gap-x-6">
              <Dato etiqueta="Fecha de creación" className="tabular-nums">
                {formatearFechaHora(product.creadoEn)}
              </Dato>
              <Dato etiqueta="Última modificación" className="tabular-nums">
                {formatearFechaHora(product.actualizadoEn)}
              </Dato>
            </dl>
          </section>
        </div>
      ),
    },
    {
      id: "movimientos",
      label: "Movimientos",
      icon: History,
      content: (
        <>
          {movimientos === null ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400 dark:text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Cargando movimientos…
            </div>
          ) : movimientos.length === 0 ? (
            <EmptyStateCompact
              icon={
                <History
                  className="h-6 w-6"
                  strokeWidth={1.75}
                  aria-hidden
                />
              }
              title="Sin movimientos"
              description="Las entradas, salidas y ajustes manuales de stock de este producto se registrarán aquí automáticamente."
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {movimientos.map((movimiento) => {
                const config =
                  MOVIMIENTO_CONFIG[movimiento.tipo] ??
                  MOVIMIENTO_CONFIG.entrada;
                const Icono = config.icon;
                return (
                  <li
                    key={movimiento.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-800"
                  >
                    <div
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                        config.iconClases,
                      )}
                    >
                      <Icono className="h-4 w-4" strokeWidth={2} aria-hidden />
                    </div>

                    {/* Izquierda: tipo + motivo */}
                    <div className="flex min-w-0 flex-col items-start gap-0.5">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span
                          className={cn(
                            "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                            config.badgeClases,
                          )}
                        >
                          {config.label}
                        </span>
                        {movimiento.loteId !== null && (
                          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                            Lote #{movimiento.loteId}
                          </span>
                        )}
                      </div>
                      {movimiento.motivo && (
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {movimiento.motivo}
                        </p>
                      )}
                    </div>

                    {/* Centro: fecha */}
                    <div className="flex-1 text-center">
                      <span className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                        {formatearFechaHora(movimiento.fechaHora)}
                      </span>
                    </div>

                    {/* Derecha: cantidad */}
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span
                        className={cn(
                          "text-base font-bold tabular-nums",
                          config.cantidadClases,
                        )}
                      >
                        {config.signo === 1 ? "+" : "−"}
                        {movimiento.cantidad}
                        <span className="ml-0.5 text-xs font-medium">
                          und
                        </span>
                      </span>
                      {movimiento.stockAnterior !== null &&
                        movimiento.stockPosterior !== null && (
                          <span className="text-[10px] font-medium tabular-nums text-slate-400 dark:text-slate-500">
                            {movimiento.stockAnterior} →{" "}
                            {movimiento.stockPosterior}
                          </span>
                        )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ),
    },
  ];

  return (
    <>
      <TabsModal
        isOpen={isOpen}
        onClose={onClose}
        title="Detalle del producto"
        tabs={pestanas}
        maxWidth="max-w-2xl"
        headerExtra={
          <ToggleActivoProducto
            producto={product}
            onChanged={onMutated}
            onDesactivado={onClose}
          />
        }
        subheaderClassName={
          loteActivo
            ? tintSubheader(loteActivo.fechaVence, productoStockBajo)
            : lotes !== null
              ? "border-red-500/20 bg-red-500/10 dark:border-red-500/40 dark:bg-red-950/40"
              : ""
        }
        subheader={
          <div className="flex items-center justify-between gap-3 text-xs">
            <div
              className={cn(
                "flex min-w-0 items-center gap-1.5 text-slate-600 dark:text-slate-300",
                lotes !== null &&
                  loteActivo === null &&
                  "text-red-600 dark:text-red-400",
              )}
            >
              <Layers
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  lotes !== null && loteActivo === null
                    ? "text-red-500 dark:text-red-400"
                    : "text-slate-400 dark:text-slate-500",
                )}
                aria-hidden
              />
              <span className="truncate">
                {lotes === null
                  ? "Cargando lote…"
                  : loteIdentidad
                    ? `Lote activo: ${loteIdentidad}`
                    : "Lote: Sin stock"}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {lotes !== null && loteActivo === null && onAgregarInventario && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus className="h-3.5 w-3.5" aria-hidden />}
                  onClick={onAgregarInventario}
                >
                  Agregar inventario
                </Button>
              )}
              {loteActivo?.fechaVence && (
                <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                  Vence: {formatearFecha(loteActivo.fechaVence)}
                </span>
              )}
              {loteActivo &&
                (() => {
                  const badge = estadoLoteActivoBadge(
                    loteActivo.fechaVence,
                    productoStockBajo,
                  );
                  return (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                        badge.clases,
                      )}
                    >
                      {badge.label}
                    </span>
                  );
                })()}
            </div>
          </div>
        }
        footer={
          <>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                icon={<Pencil className="h-4 w-4" />}
                onClick={onEdit}
              >
                Editar
              </Button>
              <Button
                variant="ghost"
                icon={<Trash2 className="h-4 w-4" />}
                onClick={onDelete}
                className="text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-500"
              >
                Eliminar
              </Button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cerrar
            </button>
          </>
        }
      />

      <ConfirmarPerdidaModal
        isOpen={perdidaSeleccion !== null}
        lote={perdidaSeleccion}
        producto={product}
        onClose={() => setPerdidaSeleccion(null)}
        onSuccess={handlePerdidaSuccess}
      />
    </>
  );
}
