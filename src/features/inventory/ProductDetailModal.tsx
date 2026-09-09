import { useEffect, useState } from "react";
import {
  Barcode,
  Boxes,
  History,
  Info,
  Pencil,
  Layers,
} from "lucide-react";
import { TabsModal, type TabsModalTab } from "../../components/ui/TabsModal";
import { Button } from "../../components/ui/Button";
import { cn } from "../../lib/cn";
import { evaluateExpiry } from "../../lib/dateUtils";
import { lotesService } from "../../services/lotes.service";
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
  onClose: () => void;
  onEdit: () => void;
}

const TIPO_VENTA_LABEL: Record<TipoVenta, string> = {
  unidad: "Unidad",
  caja: "Caja",
  combo: "Combo",
};

const DETALLE_DIAS_VENCER = 30;

function formatearPrecio(valor: number): string {
  return `$${valor.toFixed(2)}`;
}

function formatearFecha(iso?: string | null): string {
  if (!iso) return "—";
  const partes = iso.split("-");
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  return iso;
}

function estadoStock(
  stock: number,
  stockMinimo: number,
): { label: string; clases: string } {
  if (stock === 0) {
    return {
      label: "Sin stock",
      clases:
        "bg-red-500/10 text-red-700 border border-red-500/30 dark:text-red-400",
    };
  }
  if (stock <= stockMinimo) {
    return {
      label: "Bajo stock",
      clases:
        "bg-amber-500/10 text-amber-700 border border-amber-500/30 dark:text-amber-400",
    };
  }
  return {
    label: "Saludable",
    clases:
      "bg-emerald-500/10 text-emerald-600 border border-emerald-500/25 dark:text-emerald-400",
  };
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
  onClose,
  onEdit,
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

  const stock = estadoStock(product.stockActual, product.stockMinimo);
  const codigosBarras = (product.codigosBarras ?? "")
    .split(",")
    .map((codigo) => codigo.trim())
    .filter(Boolean);

  const pestanas: TabsModalTab[] = [
    {
      id: "informacion",
      label: "Información",
      icon: Info,
      content: (
        <div className="flex flex-col gap-4">
          {/* Cabecera del producto */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-900/40">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {product.nombre}
              {marcaNombre && (
                <span className="ml-2 font-normal text-slate-400 dark:text-slate-500">
                  · {marcaNombre}
                </span>
              )}
            </h3>
            <div className="mt-2 flex flex-col gap-1 text-xs font-medium text-slate-400 dark:text-slate-500">
              {categoriaNombre && (
                <p>
                  <span className="font-semibold text-slate-500 dark:text-slate-400">
                    Categoría:{" "}
                  </span>
                  {categoriaNombre}
                </p>
              )}
              <p>
                <span className="font-semibold text-slate-500 dark:text-slate-400">
                  Tipo de venta:{" "}
                </span>
                {TIPO_VENTA_LABEL[product.tipoVenta]}
              </p>
              {product.variante && (
                <p>
                  <span className="font-semibold text-slate-500 dark:text-slate-400">
                    Variante:{" "}
                  </span>
                  {product.variante}
                </p>
              )}
            </div>
          </div>

          {/* Grilla de precios */}
          <div className="grid grid-cols-3 gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-900/40">
            <Panel etiqueta="Costo unitario">
              <span className="text-slate-500 dark:text-slate-400">
                {formatearPrecio(product.costo)}
              </span>
            </Panel>
            <Panel etiqueta="Precio de venta">
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {formatearPrecio(product.precioVenta)}
              </span>
            </Panel>
            <Panel etiqueta="Precio mayoreo">
              <span className="text-slate-500 dark:text-slate-400">
                {product.precioMayoreo > 0
                  ? formatearPrecio(product.precioMayoreo)
                  : "—"}
              </span>
            </Panel>
          </div>

          {/* Identificación y códigos */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-900/40">
            <div className="flex items-center gap-2">
              <Barcode className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Código interno
              </span>
              <code className="ml-auto select-all rounded-md bg-slate-100 px-2 py-0.5 font-mono text-sm font-semibold tracking-wide text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                {product.codigoInterno}
              </code>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Códigos de barra
              </span>
              {codigosBarras.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {codigosBarras.map((codigo) => (
                    <code
                      key={codigo}
                      className="select-all rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {codigo}
                    </code>
                  ))}
                </div>
              ) : (
                <span className="text-xs italic text-slate-400 dark:text-slate-500">
                  Sin código de barra
                </span>
              )}
            </div>
          </div>

          {/* Stock */}
          <div className="grid grid-cols-2 items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-900/40">
            <Panel etiqueta="Stock actual">
              <span
                className={cn(
                  "tabular-nums",
                  product.stockActual <= product.stockMinimo &&
                    "text-red-600 dark:text-red-400",
                )}
              >
                {product.stockActual}
              </span>
            </Panel>
            <Panel etiqueta="Stock mínimo">
              <span className="tabular-nums">{product.stockMinimo}</span>
            </Panel>
            <div className="col-span-2 flex items-center justify-between gap-2 border-t border-slate-200/70 pt-3 dark:border-slate-800/60">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Estado del stock
              </span>
              <span
                className={cn(
                  "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                  stock.clases,
                )}
              >
                {stock.label}
              </span>
            </div>
          </div>
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
      maxWidth="max-w-2xl"
      footer={
        <>
          <Button
            variant="secondary"
            icon={<Pencil className="h-4 w-4" />}
            onClick={onEdit}
          >
            Editar Producto
          </Button>
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