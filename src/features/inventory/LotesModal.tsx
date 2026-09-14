import { useEffect, useState } from "react";
import {
  Activity,
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
import { TabsModal } from "../../components/ui/TabsModal";
import { Tooltip } from "../../components/ui/Tooltip";
import { ConfirmarPerdidaModal } from "./ConfirmarPerdidaModal";
import { LotQuickActionsModal } from "./lote-actions/LotQuickActionsModal";
import { AgregarInventarioForm } from "./quick-actions/AgregarInventarioForm";
import { FORM_ID } from "./quick-actions/types";
import { EmptyStateCompact } from "../../components/ui/EmptyStateCompact";
import { DETALLE_DIAS_VENCER } from "./loteHelpers";
import type { Lote, Producto } from "../../../electron/db/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface LotesModalProps {
  isOpen: boolean;
  product: Producto;
  marcaNombre?: string;
  categoriaNombre?: string;
  onClose: () => void;
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
// Modal tabbed de gestión de lotes
// ---------------------------------------------------------------------------
// Tres pestañas para ordenar la información:
//  - Vigentes: lote activo + lotes con stock no vencidos (lo operativo).
//  - Vencidos: lotes con stock vencidos, esperando confirmación de pérdida.
//  - Historial: lotes agotados (cantidad inicial agotada).
export function LotesModal({
  isOpen,
  product,
  marcaNombre,
  categoriaNombre,
  onClose,
  onMutated,
}: LotesModalProps) {
  const [lotes, setLotes] = useState<Lote[] | null>(null);
  const [quickActionsLote, setQuickActionsLote] = useState<Lote | null>(null);
  const [deletingLote, setDeletingLote] = useState<Lote | null>(null);
  const [agregarInventarioAbierto, setAgregarInventarioAbierto] =
    useState(false);
  const [submittingInventario, setSubmittingInventario] = useState(false);
  const [perdidaSeleccion, setPerdidaSeleccion] = useState<Lote | null>(null);

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

  /** Refresca lotes internamente y notifica al padre para que recargue el producto */
  const refreshData = () => {
    void lotesService
      .getByProducto(product.id)
      .then(setLotes)
      .catch(() => setLotes([]));
    onMutated();
  };

  // --- Separar lotes según su estado: activo, vigentes, vencidos e historial ---
  // Lote activo = el que se consume (FEFO): con stock que vence primero, sin fecha al final.
  const loteActivo =
    lotes === null
      ? null
      : (lotes
          .filter((l) => l.cantidadActual > 0)
          .sort((a, b) => {
            if (!a.fechaVence) return 1;
            if (!b.fechaVence) return -1;
            return a.fechaVence.localeCompare(b.fechaVence);
          })[0] ?? null);
  const lotesVigentes =
    lotes?.filter(
      (l) =>
        l.id !== loteActivo?.id &&
        l.cantidadActual > 0 &&
        !esLoteVencido(l.fechaVence),
    ) ?? [];
  // Los vencidos con stock NO son historial: esperan confirmación de pérdida.
  const lotesVencidos =
    lotes?.filter(
      (l) =>
        l.id !== loteActivo?.id &&
        l.cantidadActual > 0 &&
        esLoteVencido(l.fechaVence),
    ) ?? [];
  const historial = lotes?.filter((l) => l.cantidadActual <= 0) ?? [];

  const handlePerdidaSuccess = () => {
    refreshData();
    setPerdidaSeleccion(null);
  };

  const handleDeleteLote = async () => {
    if (!deletingLote) return;
    try {
      await lotesService.delete(deletingLote.id);
      toast.success("Lote eliminado correctamente");
      refreshData();
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
    refreshData();
  };

  // --- Estados de carga / vacío, compartidos por las pestañas ---
  const cargando = (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-6 text-center text-sm text-slate-500 dark:border-slate-800/80 dark:bg-slate-900/40 dark:text-slate-400">
      Cargando lotes…
    </div>
  );

  const sinLotes = (
    <EmptyStateCompact
      icon={<Boxes className="h-6 w-6" strokeWidth={1.75} aria-hidden />}
      title="Sin lotes cargados"
      description="Los costos históricos y vencimientos por tanda se mostrarán acá cuando se registre inventario."
      action={
        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="h-4 w-4" aria-hidden />}
          onClick={() => setAgregarInventarioAbierto(true)}
        >
          Agregar inventario
        </Button>
      }
    />
  );

  const sinLoteActivo = (
    <EmptyStateCompact
      icon={<PackageX className="h-6 w-6" strokeWidth={1.75} aria-hidden />}
      title="Sin lote activo"
      description="Todos los lotes fueron agotados. Agregá inventario para registrar una nueva tanda."
      action={
        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="h-4 w-4" aria-hidden />}
          onClick={() => setAgregarInventarioAbierto(true)}
        >
          Agregar inventario
        </Button>
      }
    />
  );

  // --- Pestaña 1: lote activo + vigentes ---
  const tabVigentes = () => {
    if (lotes === null) return cargando;
    if (lotes.length === 0) return sinLotes;
    if (loteActivo === null) return sinLoteActivo;
    return (
      <div className="flex flex-col gap-4">
        {loteActivo && (
          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <Activity className="h-4 w-4" strokeWidth={2} aria-hidden />
              Lote activo
            </h4>
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
          </div>
        )}

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

        {lotesVigentes.length === 0 &&
          lotesVencidos.length === 0 &&
          historial.length === 0 && (
            <p className="text-center text-xs text-slate-400 dark:text-slate-500">
              Este es el único lote registrado para el producto.
            </p>
          )}
      </div>
    );
  };

  // --- Pestaña 2: lotes vencidos con stock, esperando confirmación de pérdida ---
  const tabVencidos = () => {
    if (lotes === null) return cargando;
    if (lotesVencidos.length === 0)
      return (
        <EmptyStateCompact
          icon={<AlertTriangle className="h-6 w-6" strokeWidth={1.75} aria-hidden />}
          title="Sin lotes vencidos"
          description="Los lotes vencidos con stock esperando confirmación de pérdida aparecerán acá."
        />
      );
    return (
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
    );
  };

  // --- Pestaña 3: historial (lotes agotados) ---
  const tabHistorial = () => {
    if (lotes === null) return cargando;
    if (historial.length === 0)
      return (
        <EmptyStateCompact
          icon={<History className="h-6 w-6" strokeWidth={1.75} aria-hidden />}
          title="Sin historial"
          description="Los lotes agotados aparecerán acá una vez que se agote su stock."
        />
      );
    return (
      <div className="flex flex-col gap-3">
        {historial.map((lote) => (
          <LoteCard
            key={lote.id}
            lote={lote}
            historial
            onEdit={
              esLoteVencido(lote.fechaVence) ? undefined : () => setQuickActionsLote(lote)
            }
            onDelete={() => setDeletingLote(lote)}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <TabsModal
        isOpen={isOpen}
        onClose={onClose}
        title="Gestión de lotes"
        maxWidth="max-w-3xl"
        defaultTabId="vigentes"
        subheader={
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
        }
        tabs={[
          {
            id: "vigentes",
            label: "Vigentes",
            icon: <Boxes className="h-4 w-4" strokeWidth={2.25} aria-hidden />,
            content: tabVigentes(),
          },
          {
            id: "vencidos",
            label: "Vencidos",
            icon: (
              <AlertTriangle
                className="h-4 w-4"
                strokeWidth={2.25}
                aria-hidden
              />
            ),
            content: tabVencidos(),
          },
          {
            id: "historial",
            label: "Historial",
            icon: <History className="h-4 w-4" strokeWidth={2.25} aria-hidden />,
            content: tabHistorial(),
          },
        ]}
        footer={
          <div className="ml-auto">
            <Button variant="ghost" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        }
      />

      {/* ================================================================ */}
      {/* MODALES ANIDADOS (se renderizan por portal sobre el TabsModal)    */}
      {/* ================================================================ */}
      {quickActionsLote && (
        <LotQuickActionsModal
          isOpen={!!quickActionsLote}
          lote={quickActionsLote}
          productoId={product.id}
          onClose={() => setQuickActionsLote(null)}
          onMutated={refreshData}
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
    </>
  );
}

// ---------------------------------------------------------------------------
// Card de lote
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
          <span
            className={cn(
              "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              esLoteVencido(lote.fechaVence)
                ? "border-red-500/20 bg-red-500/10 text-red-500/80 dark:text-red-400/80"
                : "border-slate-200/70 bg-slate-100/70 text-slate-500 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-400",
            )}
          >
            {esLoteVencido(lote.fechaVence) ? "Descartado" : "Agotado"}
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