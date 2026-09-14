import { useState } from "react";
import {
  AlertTriangle,
  Boxes,
  Calendar,
  History,
  PackageX,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/cn";
import { evaluateExpiry } from "../../lib/dateUtils";
import { lotesService } from "../../services/lotes.service";
import { Button } from "../../components/ui/Button";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { Modal } from "../../components/ui/Modal";
import { Tooltip } from "../../components/ui/Tooltip";
import { ConfirmarPerdidaModal } from "./ConfirmarPerdidaModal";
import { LotQuickActionsModal } from "./lote-actions/LotQuickActionsModal";
import { AgregarInventarioForm } from "./quick-actions/AgregarInventarioForm";
import { FORM_ID } from "./quick-actions/types";
import { DETALLE_DIAS_VENCER } from "./loteHelpers";
import type { Lote, Producto } from "../../../electron/db/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface ProductLotsTabProps {
  product: Producto;
  marcaNombre?: string;
  categoriaNombre?: string;
  lotes: Lote[] | null;
  onMutated: () => void;
}

// ---------------------------------------------------------------------------
// Helpers de formateo
// ---------------------------------------------------------------------------
function formatearPrecio(valor: number): string {
  return `$${valor.toFixed(2)}`;
}

function formatearFecha(iso?: string | null): string {
  if (!iso) return "—";
  const partes = iso.split("-");
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  return iso;
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
      label: "Vigente",
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

function esLoteVencido(fechaVence: string | null): boolean {
  if (!fechaVence) return false;
  return evaluateExpiry(fechaVence)?.status === "expired";
}

function stockHealthIndicator(cantidadActual: number, cantidadInicial: number) {
  if (cantidadActual <= 0) return "text-red-500 dark:text-red-400";
  const ratio = cantidadInicial > 0 ? cantidadActual / cantidadInicial : 1;
  if (ratio <= 0.25) return "text-amber-500 dark:text-amber-400";
  return "text-emerald-500 dark:text-emerald-400";
}

// ---------------------------------------------------------------------------
// Componente principal: Pestaña de Lotes
// ---------------------------------------------------------------------------
export function ProductLotsTab({
  product,
  marcaNombre,
  categoriaNombre,
  lotes,
  onMutated,
}: ProductLotsTabProps) {
  const [quickActionsLote, setQuickActionsLote] = useState<Lote | null>(null);
  const [deletingLote, setDeletingLote] = useState<Lote | null>(null);
  const [agregarInventarioAbierto, setAgregarInventarioAbierto] =
    useState(false);
  const [submittingInventario, setSubmittingInventario] = useState(false);
  const [perdidaSeleccion, setPerdidaSeleccion] = useState<Lote | null>(null);

  // --- Estado de carga ---
  if (lotes === null) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-6 text-center text-sm text-slate-500 dark:border-slate-800/80 dark:bg-slate-900/40 dark:text-slate-400">
        Cargando lotes…
      </div>
    );
  }

  // --- Estado vacío ---
  if (lotes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/40 p-10 text-center dark:border-slate-700/60 dark:bg-slate-900/20">
        <div className="rounded-full bg-slate-100 p-3 dark:bg-slate-800/60">
          <Boxes
            className="h-6 w-6 text-slate-400 dark:text-slate-500"
            strokeWidth={1.75}
          />
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Sin lotes cargados
        </p>
        <p className="max-w-xs text-xs text-slate-400 dark:text-slate-500">
          Los costos históricos y vencimientos por tanda se mostrarán acá
          cuando se registre inventario.
        </p>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="h-4 w-4" aria-hidden />}
          onClick={() => setAgregarInventarioAbierto(true)}
        >
          Agregar inventario
        </Button>
      </div>
    );
  }

  // --- Separar lotes según su estado: activo, vigentes, vencidos e historial ---
  // Lote activo = el que se consume (FEFO): con stock que vence primero, sin fecha al final.
  const loteActivo =
    lotes
      .filter((l) => l.cantidadActual > 0)
      .sort((a, b) => {
        if (!a.fechaVence) return 1;
        if (!b.fechaVence) return -1;
        return a.fechaVence.localeCompare(b.fechaVence);
      })[0] ?? null;
  const lotesVigentes = lotes.filter(
    (l) =>
      l.id !== loteActivo?.id &&
      l.cantidadActual > 0 &&
      !esLoteVencido(l.fechaVence),
  );
  // Los vencidos con stock NO son historial: esperan confirmación de pérdida.
  const lotesVencidos = lotes.filter(
    (l) =>
      l.id !== loteActivo?.id &&
      l.cantidadActual > 0 &&
      esLoteVencido(l.fechaVence),
  );
  const historial = lotes.filter((l) => l.cantidadActual <= 0);

  const handlePerdidaSuccess = () => {
    onMutated();
    setPerdidaSeleccion(null);
  };

  const handleDeleteLote = async () => {
    if (!deletingLote) return;
    try {
      await lotesService.delete(deletingLote.id);
      toast.success("Lote eliminado correctamente");
      onMutated();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al eliminar lote",
      );
      throw error; // Mantiene el ConfirmModal abierto
    }
  };

  const handleCloseInventario = () => {
    setAgregarInventarioAbierto(false);
    setSubmittingInventario(false);
  };

  const handleInventarioSuccess = () => {
    handleCloseInventario();
    onMutated();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ================================================================ */}
      {/* ENCABEZADO: producto + agregar inventario                        */}
      {/* ================================================================ */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate font-display text-base font-bold text-slate-900 dark:text-slate-100">
            {product.nombre}
            {product.variante && (
              <span className="ml-2 text-sm font-medium text-slate-400 dark:text-slate-500">
                · {product.variante}
              </span>
            )}
          </span>
          {(marcaNombre || categoriaNombre) && (
            <span className="truncate text-xs font-medium text-slate-400 dark:text-slate-500">
              {[marcaNombre, categoriaNombre].filter(Boolean).join(" · ")}
            </span>
          )}
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="h-4 w-4" aria-hidden />}
          onClick={() => setAgregarInventarioAbierto(true)}
        >
          Agregar inventario
        </Button>
      </div>

      {/* ================================================================ */}
      {/* CARD DESTACADA: LOTE ACTIVO                                      */}
      {/* ================================================================ */}
      {loteActivo && (
        <LoteCard
          lote={loteActivo}
          destacado
          onEdit={() => setQuickActionsLote(loteActivo)}
          onConfirmarPerdida={
            esLoteVencido(loteActivo.fechaVence)
              ? () => setPerdidaSeleccion(loteActivo)
              : undefined
          }
        />
      )}

      {/* ================================================================ */}
      {/* LOTES VIGENTES                                                   */}
      {/* ================================================================ */}
      {lotesVigentes.length > 0 && (
        <div>
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <Boxes className="h-4 w-4" strokeWidth={2} aria-hidden />
            Lotes vigentes
          </h4>
          <div className="flex flex-col gap-3">
            {lotesVigentes.map((lote) => (
              <LoteCard
                key={lote.id}
                lote={lote}
                onEdit={() => setQuickActionsLote(lote)}
                onDelete={() => setDeletingLote(lote)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* LOTES VENCIDOS (con stock, esperando confirmación de pérdida)    */}
      {/* ================================================================ */}
      {lotesVencidos.length > 0 && (
        <div>
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-red-600/80 dark:text-red-400/80">
            <AlertTriangle className="h-4 w-4" strokeWidth={2} aria-hidden />
            Lotes vencidos
          </h4>
          <div className="flex flex-col gap-3">
            {lotesVencidos.map((lote) => (
              <LoteCard
                key={lote.id}
                lote={lote}
                vencido
                onEdit={() => setQuickActionsLote(lote)}
                onDelete={() => setDeletingLote(lote)}
                onConfirmarPerdida={() => setPerdidaSeleccion(lote)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Si no hay más vigentes ni historial, solo está el activo */}
      {lotesVigentes.length === 0 &&
        lotesVencidos.length === 0 &&
        historial.length === 0 &&
        loteActivo && (
          <p className="text-center text-xs text-slate-400 dark:text-slate-500">
            Este es el único lote registrado para el producto.
          </p>
        )}

      <div className="flex flex-col gap-4 border-t border-slate-200 pt-4 dark:border-slate-800">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          <History className="h-4 w-4" strokeWidth={2} aria-hidden />
          Historial de lotes
        </h4>
        {historial.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 p-4 text-center text-xs text-slate-400 dark:border-slate-700/60 dark:bg-slate-900/20 dark:text-slate-500">
            Sin lotes en el historial.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {historial.map((lote) => (
              <LoteCard
                key={lote.id}
                lote={lote}
                historial
                onEdit={() => setQuickActionsLote(lote)}
                onDelete={() => setDeletingLote(lote)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* MODALES                                                          */}
      {/* ================================================================ */}
      {quickActionsLote && (
        <LotQuickActionsModal
          isOpen={!!quickActionsLote}
          lote={quickActionsLote}
          productoId={product.id}
          onClose={() => setQuickActionsLote(null)}
          onMutated={onMutated}
        />
      )}

      <Modal
        isOpen={agregarInventarioAbierto}
        onClose={handleCloseInventario}
        maxWidth="lg"
        title="Agregar Inventario"
      >
        <div className="flex flex-col">
          <AgregarInventarioForm
            producto={product}
            onCancel={handleCloseInventario}
            onSuccess={handleInventarioSuccess}
            onSubmittingChange={setSubmittingInventario}
          />
        </div>
        <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800/60">
          <Button
            type="submit"
            form={FORM_ID["agregar-inventario"]}
            variant="primary"
            loading={submittingInventario}
          >
            Confirmar
          </Button>
          <Button type="button" variant="ghost" onClick={handleCloseInventario}>
            Cerrar
          </Button>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deletingLote}
        onClose={() => setDeletingLote(null)}
        onConfirm={handleDeleteLote}
        title="Eliminar lote"
        description={
          deletingLote && deletingLote.cantidadActual > 0
            ? `Este lote tiene ${deletingLote.cantidadActual} unidades disponibles. Al eliminarlo, el stock del producto se reducirá en esa cantidad.`
            : "¿Estás seguro de que querés eliminar este lote? Esta acción no se puede deshacer."
        }
        confirmText="Eliminar"
      />

      <ConfirmarPerdidaModal
        isOpen={perdidaSeleccion !== null}
        lote={perdidaSeleccion}
        producto={product}
        onClose={() => setPerdidaSeleccion(null)}
        onSuccess={handlePerdidaSuccess}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-componentes auxiliares
// ---------------------------------------------------------------------------
function LoteCard({
  lote,
  destacado = false,
  vencido = false,
  historial = false,
  onEdit,
  onDelete,
  onConfirmarPerdida,
}: {
  lote: Lote;
  destacado?: boolean;
  vencido?: boolean;
  historial?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onConfirmarPerdida?: () => void;
}) {
  const vencimiento = badgeVencimiento(lote.fechaVence);
  const esHistorial = historial;
  const esDestacadoVencido = destacado && esLoteVencido(lote.fechaVence);
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-4 transition-colors",
        destacado &&
          !esDestacadoVencido &&
          "border-emerald-500/30 bg-white dark:bg-slate-900/50",
        esDestacadoVencido &&
          "border-amber-500/40 bg-amber-500/[0.04] dark:border-amber-500/40 dark:bg-amber-950/20",
        !destacado &&
          !vencido &&
          !esHistorial &&
          "border-slate-200/80 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-900/40",
        vencido &&
          "border-amber-500/40 bg-amber-500/[0.04] dark:border-amber-500/40 dark:bg-amber-950/20",
        esHistorial &&
          "border-red-500/10 bg-red-500/[0.03] dark:border-red-500/15 dark:bg-red-950/20",
      )}
    >
      {/* Línea superior */}
      <div className="flex flex-wrap items-center gap-2">
        {destacado && (
          <span
            className={cn(
              "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              esDestacadoVencido
                ? "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
            )}
          >
            Activo
          </span>
        )}
        {esHistorial && (
          <span className="inline-flex items-center rounded-md border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-500/80 dark:text-red-400/80">
            {lote.cantidadActual <= 0 ? "Agotado" : "Vencido"}
          </span>
        )}
        <span
          className={cn(
            "font-mono text-sm font-bold",
            esHistorial
              ? "text-slate-500/80 dark:text-slate-400/70"
              : "text-slate-900 dark:text-slate-100",
          )}
        >
          {lote.numeroLote ?? `Lote #${lote.id}`}
        </span>

        {/* Acciones a la derecha: badge de estado + acciones */}
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {lote.fechaVence && (
            <span
              className={cn(
                "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                vencimiento.clases,
              )}
            >
              {vencimiento.label}
            </span>
          )}
          {onEdit && (
            <Tooltip content="Editar lote" placement="top">
              <button
                type="button"
                onClick={onEdit}
                aria-label="Editar lote"
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-black/5 hover:text-slate-800 sm:h-8 sm:w-8 sm:rounded-xl dark:hover:bg-white/5 dark:hover:text-slate-100"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          )}
          {onDelete && (
            <Tooltip content="Eliminar lote" placement="top">
              <button
                type="button"
                onClick={onDelete}
                aria-label="Eliminar lote"
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 sm:h-8 sm:w-8 sm:rounded-xl dark:hover:bg-red-950/40 dark:hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Métricas del lote: grid de 3 columnas */}
      <div className="mt-4 grid grid-cols-3 gap-4 border-t border-slate-200 pt-3 dark:border-slate-800">
        {/* Stock disponible */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Stock disponible
          </span>
          <span
            className={cn(
              "font-mono text-lg font-bold tabular-nums",
              esHistorial
                ? "text-slate-400/80 dark:text-slate-500/70"
                : stockHealthIndicator(
                    lote.cantidadActual,
                    lote.cantidadInicial,
                  ),
            )}
          >
            {lote.cantidadActual}
          </span>
        </div>

        {/* Vencimiento */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Vencimiento
          </span>
          {lote.fechaVence ? (
            <div className="flex items-center gap-1.5">
              <Calendar
                className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500"
                aria-hidden
              />
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  esHistorial
                    ? "text-slate-500/80 dark:text-slate-400/70"
                    : "text-slate-800 dark:text-slate-100",
                )}
              >
                {formatearFecha(lote.fechaVence)}
              </span>
            </div>
          ) : (
            <span className="text-xs font-medium italic text-slate-500 opacity-70 dark:text-slate-400">
              Sin vencimiento
            </span>
          )}
        </div>

        {/* Costo unitario */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Costo unitario
          </span>
          <span
            className={cn(
              "font-mono text-sm font-bold tabular-nums",
              esHistorial
                ? "text-slate-500/80 dark:text-slate-400/70"
                : "text-slate-800 dark:text-slate-100",
            )}
          >
            {formatearPrecio(lote.costoUnitario)}
          </span>
        </div>
      </div>

      {/* Acción de confirmación de pérdida: solo para vencidos, abajo de la card */}
      {onConfirmarPerdida && (
        <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
          <Button
            variant="danger"
            size="sm"
            className="w-full"
            icon={<PackageX className="h-3.5 w-3.5" aria-hidden />}
            onClick={onConfirmarPerdida}
          >
            Confirmar pérdida
          </Button>
        </div>
      )}
    </div>
  );
}