import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Input } from "../../../components/ui/Input";
import { lotesService } from "../../../services/lotes.service";
import { cn } from "../../../lib/cn";
import type { Lote } from "../../../../electron/db/types";
import { HeaderLote } from "./HeaderLote";
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
  onCancel: () => void;
  onSuccess: () => void;
  onSubmittingChange: (submitting: boolean) => void;
}

export function AjustarStockLoteForm({
  lote,
  onCancel,
  onSuccess,
  onSubmittingChange,
}: AjustarStockLoteFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AjustarStockLoteValues>({
    defaultValues: VALORES_INICIALES_AJUSTAR,
  });

  const nuevoStock = useWatch({ control, name: "nuevoStock" }) ?? "";
  const nuevoStockNum = nuevoStock !== "" ? Number(nuevoStock) : NaN;
  const diferenciaValida = !Number.isNaN(nuevoStockNum);
  const diferencia = nuevoStockNum - lote.cantidadActual;

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
      id={FORM_ID_LOTE["ajustar-stock"]}
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <HeaderLote
        lote={lote}
        titulo={ACCION_LABEL_LOTE["ajustar-stock"]}
        onBack={onCancel}
      />
      <div className="space-y-4">
        <div>
          <Input
            label={`Stock actual en este lote: ${lote.cantidadActual}`}
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
                  !Number.isNaN(Number(val)) || "Debe ser un número válido",
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
        </div>
        <Input
          label="Motivo"
          type="text"
          disabled={isSubmitting}
          error={errors.motivo?.message}
          placeholder="Ej: Ajuste por conteo físico"
          {...register("motivo")}
        />
      </div>
    </form>
  );
}