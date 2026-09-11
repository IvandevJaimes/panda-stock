import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Input } from "../../../components/ui/Input";
import { movimientosService } from "../../../services/movimientos.service";
import { cn } from "../../../lib/cn";
import type { Producto } from "../../../../electron/db/types";
import { HeaderMini } from "./HeaderMini";
import { ACCION_LABEL, FORM_ID, noSpinnersClass } from "./types";

interface AjustarStockValues {
  cantidad: string;
  motivo: string;
}

const VALORES_INICIALES_AJUSTAR = {
  cantidad: "",
  motivo: "",
} as const;

interface AjustarStockFormProps {
  producto: Producto;
  loteId: number | null;
  onCancel: () => void;
  onSuccess: () => void;
  onSubmittingChange: (submitting: boolean) => void;
}

export function AjustarStockForm({ producto, loteId, onCancel, onSuccess, onSubmittingChange }: AjustarStockFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AjustarStockValues>({
    defaultValues: VALORES_INICIALES_AJUSTAR,
  });

  const cantidad = useWatch({ control, name: "cantidad" }) ?? "";
  const cantidadNum = cantidad !== "" ? Number(cantidad) : NaN;
  const diferenciaValida = !Number.isNaN(cantidadNum);
  const diferencia = cantidadNum - producto.stockActual;

  const onSubmit = async (data: AjustarStockValues) => {
    onSubmittingChange(true);
    try {
      const diff = Number(data.cantidad) - producto.stockActual;
      if (diff === 0) {
        toast.info("El stock es igual al actual");
        return;
      }

      const tipo = diff > 0 ? "ajuste_positivo" : "ajuste_negativo";

      await movimientosService.crearMovimiento({
        productoId: producto.id,
        loteId,
        tipo,
        cantidad: Math.abs(diff),
        motivo: data.motivo.trim(),
      });
      toast.success("Stock ajustado correctamente");
      onSuccess();
    } catch (error: unknown) {
      const mensaje = error instanceof Error ? error.message : String(error);
      toast.error(mensaje || "Error al ajustar stock");
    } finally {
      onSubmittingChange(false);
    }
  };

  return (
    <form
      id={FORM_ID["ajustar-stock"]}
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <HeaderMini
        producto={producto}
        titulo={ACCION_LABEL["ajustar-stock"]}
        onBack={onCancel}
      />
      <div className="space-y-4">
        <div>
          <Input
            label={`Stock registrado en sistema: ${producto.stockActual}`}
            type="number"
            step="any"
            min="0"
            autoFocus
            disabled={isSubmitting}
            error={errors.cantidad?.message}
            className={noSpinnersClass}
            {...register("cantidad", {
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
          {...register("motivo", {
            required: "Ingrese el motivo del ajuste",
          })}
        />
      </div>
    </form>
  );
}