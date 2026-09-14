import { useState } from "react";
import {
  Boxes,
  Calendar,
  History,
  Layers,
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
import { LotQuickActionsModal } from "./lote-actions/LotQuickActionsModal";
import { AgregarInventarioForm } from "./quick-actions/AgregarInventarioForm";
import { FORM_ID } from "./quick-actions/types";
import { DETALLE_DIAS_VENCER, estadoLoteBadge } from "./loteHelpers";
import type { Lote, Producto } from "../../../electron/db/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface ProductLotsTabProps {
  product: Producto;
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
  lotes,
  onMutated,
}: ProductLotsTabProps) {
  const [quickActionsLote, setQuickActionsLote] = useState<Lote | null>(null);
  const [deletingLote, setDeletingLote] = useState<Lote | null>(null);
  const [historialAbierto, setHistorialAbierto] = useState(false);
  const [agregarInventarioAbierto, setAgregarInventarioAbierto] =
    useState(false);
  const [submittingInventario, setSubmittingInventario] = useState(false);

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

  // --- Separar lote activo, lotes vigentes e historial ---
  const loteActivo = lotes.find((l) => l.cantidadActual > 0) ?? null;
  const lotesVigentes = lotes.filter(
    (l) =>
      l.id !== loteActivo?.id &&
      l.cantidadActual > 0 &&
      !esLoteVencido(l.fechaVence),
  );
  const historial = lotes.filter(
    (l) => l.cantidadActual <= 0 || esLoteVencido(l.fechaVence),
  );

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
      {/* ENCABEZADO: historial + agregar inventario                       */}
      {/* ================================================================ */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Layers
            className="h-4 w-4 text-emerald-500 dark:text-emerald-400"
            strokeWidth={2}
            aria-hidden
          />
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Gestión de lotes
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<History className="h-4 w-4" aria-hidden />}
            onClick={() => setHistorialAbierto(true)}
          >
            Historial de lotes
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="h-4 w-4" aria-hidden />}
            onClick={() => setAgregarInventarioAbierto(true)}
          >
            Agregar inventario
          </Button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* CARD DESTACADA: LOTE ACTIVO                                      */}
      {/* ================================================================ */}
      {loteActivo && (
        <div className="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-white p-4 dark:bg-slate-900/50">
          {/* Línea superior */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Activo
            </span>
            <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
              {loteActivo.numeroLote ?? `Lote #${loteActivo.id}`}
            </span>

            {/* Acciones a la derecha: solo editar, el lote activo no se puede eliminar */}
            <div className="ml-auto flex items-center gap-0.5">
              <Tooltip content="Editar lote" placement="top">
                <button
                  type="button"
                  onClick={() => setQuickActionsLote(loteActivo)}
                  aria-label="Editar lote"
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-black/5 hover:text-slate-800 sm:h-8 sm:w-8 sm:rounded-xl dark:hover:bg-white/5 dark:hover:text-slate-100"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Métricas del lote activo: grid de 3 columnas */}
          <div className="mt-4 grid grid-cols-3 gap-4 border-t border-slate-200 pt-3 dark:border-slate-800">
            {/* Stock disponible */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Stock disponible
              </span>
              <span
                className={cn(
                  "font-mono text-lg font-bold tabular-nums",
                  stockHealthIndicator(
                    loteActivo.cantidadActual,
                    loteActivo.cantidadInicial,
                  ),
                )}
              >
                {loteActivo.cantidadActual}
              </span>
            </div>

            {/* Vencimiento */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Vencimiento
              </span>
              {loteActivo.fechaVence ? (
                <div className="flex items-center gap-1.5">
                  <Calendar
                    className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500"
                    aria-hidden
                  />
                  <span className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                    {formatearFecha(loteActivo.fechaVence)}
                  </span>
                </div>
              ) : (
                <span className="text-xs font-medium italic text-slate-500 opacity-70 dark:text-slate-400">
                  Sin vencimiento
                </span>
              )}
              {loteActivo.fechaVence && (
                <VencimientoBadge fechaVence={loteActivo.fechaVence} />
              )}
            </div>

            {/* Costo de entrada */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Costo de entrada
              </span>
              <span className="font-mono text-sm font-bold tabular-nums text-slate-800 dark:text-slate-100">
                {formatearPrecio(loteActivo.costoUnitario)}
              </span>
            </div>
          </div>
        </div>
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
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/80 bg-slate-50/50 dark:divide-slate-800 dark:border-slate-800/80 dark:bg-slate-900/40">
            {lotesVigentes.map((lote) => {
              const vencimiento = badgeVencimiento(lote.fechaVence);
              return (
                <div
                  key={lote.id}
                  className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3"
                >
                  {/* Identificador */}
                  <span className="min-w-[100px] font-mono text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-200">
                    {lote.numeroLote ?? `Lote #${lote.id}`}
                  </span>

                  {/* Datos compactos */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 sm:ml-auto">
                    <MetricaCompacta
                      etiqueta="Disp."
                      valor={String(lote.cantidadActual)}
                      mono
                    />
                    <MetricaCompacta
                      etiqueta="Costo"
                      valor={formatearPrecio(lote.costoUnitario)}
                      mono
                    />
                    <div className="flex items-center gap-1.5">
                      {lote.fechaVence ? (
                        <>
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
                        </>
                      ) : (
                        <span className="text-xs font-medium italic text-slate-500 opacity-70 dark:text-slate-400">
                          Sin vencimiento
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Acciones: editar + eliminar (solo lotes no activos) */}
                  <div className="flex items-center gap-0.5 sm:ml-2">
                    <Tooltip content="Editar lote" placement="top">
                      <button
                        type="button"
                        onClick={() => setQuickActionsLote(lote)}
                        aria-label="Editar lote"
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-black/5 hover:text-slate-800 sm:h-8 sm:w-8 sm:rounded-xl dark:hover:bg-white/5 dark:hover:text-slate-100"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </Tooltip>
                    <Tooltip content="Eliminar lote" placement="top">
                      <button
                        type="button"
                        onClick={() => setDeletingLote(lote)}
                        aria-label="Eliminar lote"
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 sm:h-8 sm:w-8 sm:rounded-xl dark:hover:bg-red-950/40 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Si no hay más vigentes ni historial, solo está el activo */}
      {lotesVigentes.length === 0 &&
        historial.length === 0 &&
        loteActivo && (
          <p className="text-center text-xs text-slate-400 dark:text-slate-500">
            Este es el único lote registrado para el producto.
          </p>
        )}

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
        isOpen={historialAbierto}
        onClose={() => setHistorialAbierto(false)}
        maxWidth="lg"
        title="Historial de lotes"
      >
        <div className="flex flex-col gap-3">
          {historial.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 p-10 text-center text-sm text-slate-400 dark:border-slate-700/60 dark:bg-slate-900/20 dark:text-slate-500">
              Sin lotes en el historial.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/80 bg-slate-50/50 dark:divide-slate-800 dark:border-slate-800/80 dark:bg-slate-900/40">
              {historial.map((lote) => {
                const vencimiento = badgeVencimiento(lote.fechaVence);
                return (
                  <div
                    key={lote.id}
                    className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3"
                  >
                    <span className="min-w-[100px] font-mono text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-200">
                      {lote.numeroLote ?? `Lote #${lote.id}`}
                    </span>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 sm:ml-auto">
                      <MetricaCompacta
                        etiqueta="Disp."
                        valor={String(lote.cantidadActual)}
                        mono
                      />
                      <MetricaCompacta
                        etiqueta="Costo"
                        valor={formatearPrecio(lote.costoUnitario)}
                        mono
                      />
                      <div className="flex items-center gap-1.5">
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
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-componentes auxiliares
// ---------------------------------------------------------------------------
function MetricaCompacta({
  etiqueta,
  valor,
  mono = false,
}: {
  etiqueta: string;
  valor: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {etiqueta}
      </span>
      <span
        className={cn(
          "text-sm font-semibold text-slate-800 dark:text-slate-100",
          mono && "font-mono tabular-nums",
        )}
      >
        {valor}
      </span>
    </div>
  );
}

function VencimientoBadge({ fechaVence }: { fechaVence: string | null }) {
  const badge = estadoLoteBadge(fechaVence);
  return (
    <span
      className={cn(
        "mt-0.5 inline-flex w-fit shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
        badge.clases,
      )}
    >
      {badge.label}
    </span>
  );
}