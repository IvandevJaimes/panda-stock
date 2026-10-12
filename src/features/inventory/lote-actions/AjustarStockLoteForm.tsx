import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { CapitalizedInput } from "../../../components/ui/CapitalizedInput";
import { FieldError } from "../../../components/ui/FieldError";
import { Input } from "../../../components/ui/Input";
import { lotesService } from "../../../services/lotes.service";
import { cn } from "../../../lib/cn";
import type { Lote } from "../../../../electron/db/types";
import { HeaderLote } from "./HeaderLote";
import { BotonGestionarLotes } from "../quick-actions/BotonGestionarLotes";
import { formatearPrecio } from "../quick-actions/formatters";
import { noSpinnersClass } from "../quick-actions/types";
import { ACCION_LABEL_LOTE, FORM_ID_LOTE } from "./types";

interface AjustarStockLoteValues {
  nuevoStock: string;
  motivo: string;
}

const VALORES_INICIALES_AJUSTAR = {
  nuevoStock: "",
  motivo: "",
} as const;

interface AjustarStockLoteFormProps {
  lote: Lote;
  stockActualProducto?: number;
  formId?: string;
  esLoteActivo?: boolean;
  onOpenLotes?: () => void;
  onCancel: () => void;
  onSuccess: () => void;
  onSubmittingChange: (submitting: boolean) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export function AjustarStockLoteForm({
  lote,
  stockActualProducto,
  formId,
  esLoteActivo = false,
  onOpenLotes,
  onCancel,
  onSuccess,
  onSubmittingChange,
  onDirtyChange,
}: AjustarStockLoteFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<AjustarStockLoteValues>({
    defaultValues: VALORES_INICIALES_AJUSTAR,
  });

  const nuevoStock = useWatch({ control, name: "nuevoStock" }) ?? "";
  const motivo = useWatch({ control, name: "motivo" }) ?? "";
  const nuevoStockNum = nuevoStock !== "" ? Number(nuevoStock) : NaN;
  const diferenciaValida = Number.isFinite(nuevoStockNum) && nuevoStockNum >= 0;
  const diferencia = diferenciaValida ? nuevoStockNum - lote.cantidadActual : 0;
  const valorAjuste = diferencia * lote.costoUnitario;
  const stockFinalProducto = stockActualProducto === undefined
    ? null
    : stockActualProducto + diferencia;

  const formatearUnidades = (valor: number) =>
    new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(valor);

  useEffect(() => onDirtyChange?.(isDirty), [isDirty, onDirtyChange]);

  const onSubmit = async (data: AjustarStockLoteValues) => {
    onSubmittingChange(true);
    try {
      const nuevoValor = Number(data.nuevoStock);
      if (nuevoValor === lote.cantidadActual) {
        toast.info("El stock del lote es el mismo");
        return;
      }
      await lotesService.update(lote.id, {
        cantidadActual: nuevoValor,
        motivo: data.motivo.trim(),
      });
      toast.success("Stock del lote ajustado correctamente");
      onSuccess();
    } catch (error: unknown) {
      const mensaje = error instanceof Error ? error.message : String(error);
      toast.error(mensaje || "Error al ajustar stock del lote");
    } finally {
      onSubmittingChange(false);
    }
  };

  return (
    <form
      id={formId ?? FORM_ID_LOTE["ajustar-stock"]}
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <HeaderLote
        lote={lote}
        titulo={ACCION_LABEL_LOTE["ajustar-stock"]}
        onBack={onCancel}
        esLoteActivo={esLoteActivo}
      />
      <div className="space-y-4">
        <div>
          <Input
            label={`Stock actual en este lote: ${lote.cantidadActual} und`}
            type="number"
            step="any"
            min="0"
            autoFocus
            disabled={isSubmitting}
            error={errors.nuevoStock?.message}
            className={noSpinnersClass}
            {...register("nuevoStock", {
              required: "El nuevo stock es obligatorio",
              validate: {
                numeroValido: (val) =>
                  Number.isFinite(Number(val)) || "Debe ser un número válido",
                noNegativo: (val) => Number(val) >= 0 || "No puede ser negativo",
              },
            })}
          />
          {diferenciaValida && diferencia !== 0 && (
            <p
              className={cn(
                "mt-1.5 text-xs font-semibold",
                diferencia > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400",
              )}
            >
              Diferencia: {diferencia > 0 ? "+" : ""}
              {diferencia}
            </p>
          )}
          {diferenciaValida && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Stock final del lote
                  </p>
                  <p className="mt-0.5 font-display text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                    {formatearUnidades(nuevoStockNum)} unidades
                  </p>
                </div>
                {stockFinalProducto !== null && (
                  <div>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Stock final del producto
                    </p>
                    <p className="mt-0.5 font-display text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                      {formatearUnidades(stockFinalProducto)} unidades
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Valor del ajuste
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 font-display text-sm font-bold tabular-nums",
                      diferencia > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : diferencia < 0
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-slate-700 dark:text-slate-300",
                    )}
                  >
                    {diferencia > 0 ? "+" : diferencia < 0 ? "−" : ""}
                    {formatearPrecio(Math.abs(valorAjuste))}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                Valorizado con el costo del lote ({formatearPrecio(lote.costoUnitario)} por unidad).
              </p>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="motivo"
            className="ml-1 text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Motivo (Opcional)
          </label>
          <CapitalizedInput
            id="motivo"
            type="text"
            disabled={isSubmitting}
            placeholder="Ej: Ajuste por conteo físico"
            value={motivo}
            className={cn(
              "border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700/80",
              errors.motivo &&
                "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10",
            )}
            onClear={() => setValue("motivo", "", { shouldDirty: true })}
            {...register("motivo")}
          />
          <FieldError error={errors.motivo?.message} />
        </div>
      </div>
      {onOpenLotes && (
        <>
          <hr className="my-4 border-slate-100 dark:border-slate-800" />
          <BotonGestionarLotes onOpenLotes={onOpenLotes} />
        </>
      )}
    </form>
  );
}
