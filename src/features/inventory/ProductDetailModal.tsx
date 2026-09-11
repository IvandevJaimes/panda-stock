import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Barcode,
  Boxes,
  CalendarDays,
  CheckCircle2,
  Clock,
  DollarSign,
  History,
  Info,
  Layers,
  Package,
  Pencil,
  QrCode,
  Trash2,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { TabsModal, type TabsModalTab } from "../../components/ui/TabsModal";
import { Button } from "../../components/ui/Button";
import { cn } from "../../lib/cn";
import { evaluateExpiry } from "../../lib/dateUtils";
import { lotesService } from "../../services/lotes.service";
import {
  DETALLE_DIAS_VENCER,
  estadoLoteBadge,
  tintPanelLote,
} from "./loteHelpers";
import type { Lote, Producto, TipoVenta } from "../../../electron/db/types";

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
  defaultTabId?: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const TIPO_VENTA_LABEL: Record<TipoVenta, string> = {
  unidad: "Por unidad",
  caja: "Por caja",
  combo: "Por combo",
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

function tintSubheader(fechaVence: string | null): string {
  if (!fechaVence) return "";
  const evaluacion = evaluateExpiry(fechaVence, DETALLE_DIAS_VENCER);
  if (evaluacion?.status === "expired") {
    return "border-red-500/20 bg-red-500/10 dark:border-red-500/40 dark:bg-red-950/40";
  }
  if (evaluacion?.status === "expiring_soon") {
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
  if (stock <= stockMinimo) {
    return (
      <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
        <AlertTriangle className="h-4 w-4" aria-hidden /> Bajo stock
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
      <CheckCircle2 className="h-4 w-4" aria-hidden /> Óptimo
    </span>
  );
}

function badgeVencimiento(
  fechaVence: string | null,
): { label: string; clases: string } {
  if (!fechaVence) {
    return {
      label: "Sin vencimiento",
      clases:
        "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700/60",
    };
  }
  const evaluacion = evaluateExpiry(fechaVence, DETALLE_DIAS_VENCER);
  if (!evaluacion || evaluacion.status === "normal") {
    return {
      label: evaluacion ? "Vigente" : "Sin vencimiento",
      clases:
        "bg-emerald-500/10 text-emerald-600 border border-emerald-500/25 dark:text-emerald-400",
    };
  }
  if (evaluacion.status === "expiring_soon") {
    return {
      label: "Por vencer",
      clases:
        "bg-amber-500/10 text-amber-700 border border-amber-500/30 dark:text-amber-400",
    };
  }
  return {
    label: "Vencido",
    clases:
      "bg-red-500/10 text-red-700 border border-red-500/30 dark:text-red-400",
  };
}

function Panel({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {etiqueta}
      </span>
      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        {children}
      </div>
    </div>
  );
}

export function ProductDetailModal({
  isOpen,
  product,
  marcaNombre,
  categoriaNombre,
  defaultTabId,
  onClose,
  onEdit,
  onDelete,
}: ProductDetailModalProps) {
  const [lotes, setLotes] = useState<Lote[] | null>(null);

  // Los lotes se cargan al abrir el modal. null = cargando; los setState viven
  // en callbacks asíncronos (.then/.catch), respetando react-hooks/set-state-in-effect.
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

    return () => {
      activo = false;
    };
  }, [isOpen, product.id]);

  const codigosBarras = (product.codigosBarras ?? "")
    .split(",")
    .map((codigo) => codigo.trim())
    .filter(Boolean);
  const precioMayoreo =
    product.precioVenta > 0 ? product.precioVenta * 0.9 : null;
  const esCodigoBarras = /^\d{8,14}$/.test(
    product.codigoInterno || product.codigosBarras || "",
  );
  const valorCodigo = esCodigoBarras
    ? codigosBarras.length > 0
      ? codigosBarras.join(", ")
      : product.codigoInterno
    : product.codigoInterno;

  const loteActivo = lotes
    ? (lotes.find((lote) => lote.cantidadActual > 0) ?? lotes[0] ?? null)
    : null;
  const loteBadge = loteActivo
    ? estadoLoteBadge(loteActivo.fechaVence)
    : {
        label: "Sin registrar",
        clases:
          "bg-slate-500/10 text-slate-400 border-slate-500/20 dark:border-slate-500/30 dark:text-slate-400",
      };
  const loteIdentidad = loteActivo
    ? (loteActivo.numeroLote ?? `Lote #${loteActivo.id}`)
    : null;

  const pestanas: TabsModalTab[] = [
    {
      id: "informacion",
      label: "Información",
      icon: Info,
      content: (
        <div className="flex flex-col divide-y divide-slate-200 dark:divide-slate-800">
          {/* Cabecera del producto */}
          <div className="flex items-center gap-3 pb-4">
            <div className="grid h-11 w-11 shrink-0 select-none place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Package className="h-5 w-5" strokeWidth={2} aria-hidden />
            </div>
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
              <Dato etiqueta="Tipo de venta">
                {TIPO_VENTA_LABEL[product.tipoVenta]}
              </Dato>
            </dl>
          </section>

          {/* Sección 2: Identificación (detección automática del tipo de código) */}
          <section className="py-4">
            <SectionTitle icon={esCodigoBarras ? Barcode : QrCode}>
              Identificación y códigos
            </SectionTitle>
            <div className="flex flex-col gap-1">
              <Dato
                etiqueta={
                  esCodigoBarras ? "Código de barras" : "Código interno"
                }
                mono
              >
                {valorCodigo}
              </Dato>
            </div>
          </section>

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
                {product.stockActual}
              </Dato>
              <Dato etiqueta="Stock mínimo">
                {product.stockMinimo > 0
                  ? product.stockMinimo
                  : "Sin mínimo"}
              </Dato>
              <Dato etiqueta="Estado de stock">
                <EstadoStock
                  stock={product.stockActual}
                  stockMinimo={product.stockMinimo}
                />
              </Dato>
              <Dato
                etiqueta="Valor de inventario"
                className="tabular-nums"
              >
                {formatearPrecio(product.stockActual * (product.costo ?? 0))}
              </Dato>
            </dl>
          </section>

          {/* Sección: Lote activo y vencimiento */}
          <section className="py-4">
            <SectionTitle icon={Layers}>Lote activo y vencimiento</SectionTitle>
            {loteActivo ? (
              <div
                className={cn(
                  "rounded-xl border p-4 transition-colors",
                  tintPanelLote(loteActivo.fechaVence),
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
                      <span className="block truncate font-mono text-base font-bold tracking-wide text-slate-900 dark:text-white">
                        {loteIdentidad}
                      </span>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                      loteBadge.clases,
                    )}
                  >
                    {loteBadge.label}
                  </span>
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
              </div>
            ) : (
              <div className="flex flex-col items-start gap-1 rounded-xl border border-dashed border-slate-200 bg-slate-50/40 p-4 dark:border-slate-700/60 dark:bg-slate-900/20">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  <Boxes className="h-4 w-4" aria-hidden />
                  Sin lote activo
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  Registrá un lote para controlar vencimientos y costos por
                  partida.
                </span>
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
                className="text-base font-bold text-emerald-600 dark:text-emerald-400"
              >
                {formatearPrecio(product.precioVenta)}
              </Dato>
              <Dato etiqueta="Precio mayoreo" className="tabular-nums">
                {precioMayoreo !== null ? formatearPrecio(precioMayoreo) : "—"}
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
      id: "lotes",
      label: "Lotes",
      icon: Layers,
      content: (
        <div className="flex flex-col gap-3">
          {lotes === null ? (
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-6 text-center text-sm text-slate-500 dark:border-slate-800/80 dark:bg-slate-900/40 dark:text-slate-400">
              Cargando lotes…
            </div>
          ) : lotes.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/40 p-10 text-center dark:border-slate-700/60 dark:bg-slate-900/20">
              <div className="bg-slate-100 p-3 rounded-full dark:bg-slate-800/60">
                <Boxes className="h-6 w-6 text-slate-400 dark:text-slate-500" strokeWidth={1.75} />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Sin lotes cargados
              </p>
              <p className="max-w-xs text-xs text-slate-400 dark:text-slate-500">
                Los costos históricos y vencimientos por tanda se mostrarán acá
                cuando se registre inventario.
              </p>
            </div>
          ) : (
            lotes.map((lote) => {
              const vencimiento = badgeVencimiento(lote.fechaVence);
              return (
                <div
                  key={lote.id}
                  className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-900/40"
                >
                  <span className="font-mono text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-200">
                    {lote.numeroLote ?? `Lote #${lote.id}`}
                  </span>
                  <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 sm:ml-auto sm:gap-x-8">
                    <Panel etiqueta="Disponible">
                      <span className="tabular-nums">{lote.cantidadActual}</span>
                    </Panel>
                    <Panel etiqueta="Costo histórico">
                      <span className="tabular-nums">
                        {formatearPrecio(lote.costoUnitario)}
                      </span>
                    </Panel>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Vencimiento
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                          {formatearFecha(lote.fechaVence)}
                        </span>
                        <span
                          className={cn(
                            "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            vencimiento.clases,
                          )}
                        >
                          {vencimiento.label}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ),
    },
    {
      id: "movimientos",
      label: "Movimientos",
      icon: History,
      content: (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/40 p-10 text-center dark:border-slate-700/60 dark:bg-slate-900/20">
          <div className="bg-slate-100 p-3 rounded-full dark:bg-slate-800/60">
            <History
              className="h-6 w-6 text-slate-400 dark:text-slate-500"
              strokeWidth={1.75}
            />
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Sin movimientos recientes
          </p>
          <p className="max-w-xs text-xs text-slate-400 dark:text-slate-500">
            Las entradas, salidas y ajustes manuales de stock se registrarán
            aquí automáticamente.
          </p>
        </div>
      ),
    },
  ];

  return (
    <TabsModal
      isOpen={isOpen}
      onClose={onClose}
      title="Detalle del producto"
      tabs={pestanas}
      defaultTabId={defaultTabId}
      maxWidth="max-w-2xl"
      subheaderClassName={
        loteActivo ? tintSubheader(loteActivo.fechaVence) : ""
      }
      subheader={
        <div className="flex items-center justify-between gap-3 text-xs">
          <div className="flex min-w-0 items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <Layers
              className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500"
              aria-hidden
            />
            <span className="truncate">
              {lotes === null
                ? "Cargando lote…"
                : loteIdentidad
                  ? `Lote activo: ${loteIdentidad}`
                  : "Lote: Sin registrar"}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {loteActivo?.fechaVence && (
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                Vence: {formatearFecha(loteActivo.fechaVence)}
              </span>
            )}
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                loteBadge.clases,
              )}
            >
              {loteBadge.label}
            </span>
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
  );
}