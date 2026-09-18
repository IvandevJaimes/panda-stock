import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Input } from "../../../components/ui/Input";
import { productosService } from "../../../services/productos.service";
import type { Producto } from "../../../../electron/db/types";
import { HeaderMini } from "./HeaderMini";
import { ACCION_LABEL, FORM_ID, noSpinnersClass } from "./types";

interface StockMinimoValues {
  stockMinimo: string;
}

interface StockMinimoFormProps {
  producto: Producto;
  stockMinimoInicial: number;
  onCancel: () => void;
  onSuccess: () => void;
  onSubmittingChange: (submitting: boolean) => void;
  onCanSaveChange?: (canSave: boolean) => void;
}

export function StockMinimoForm({
  producto,
  stockMinimoInicial,
  onCancel,
  onSuccess,
  onSubmittingChange,
  onCanSaveChange,
}: StockMinimoFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<StockMinimoValues>({
    defaultValues: {
      stockMinimo: stockMinimoInicial > 0 ? String(stockMinimoInicial) : "",
    },
  });

  const stockMinimo = useWatch({ control, name: "stockMinimo" }) ?? "";

  useEffect(() => {
    const valorNormalizado = Math.max(
      0,
      Math.round(Number(stockMinimo) || 0),
    );
    onCanSaveChange?.(valorNormalizado !== stockMinimoInicial);
  }, [stockMinimo, stockMinimoInicial, onCanSaveChange]);

  const onSubmit = async (data: StockMinimoValues) => {
    onSubmittingChange(true);
    const valor = Math.max(0, Math.round(Number(data.stockMinimo) || 0));
    try {
      await productosService.updateStockMinimo(producto.id, valor);
      toast.success(
        valor > 0
          ? `Stock mínimo actualizado a ${valor}`
          : "Stock mínimo eliminado",
      );
      onSuccess();
    } catch (error: unknown) {
      const mensaje = error instanceof Error ? error.message : String(error);
      toast.error(mensaje || "Error al actualizar stock mínimo");
    } finally {
      onSubmittingChange(false);
    }
  };

  return (
    <form
      id={FORM_ID["stock-minimo"]}
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <HeaderMini
        producto={producto}
        titulo={ACCION_LABEL["stock-minimo"]}
        onBack={onCancel}
      />
      <div className="space-y-4">
        <div>
          <Input
            label="Stock mínimo"
            type="number"
            step="1"
            min="0"
            autoFocus
            disabled={isSubmitting}
            error={errors.stockMinimo?.message}
            placeholder="0 = sin alerta de stock bajo"
            className={noSpinnersClass}
            {...register("stockMinimo", {
              validate: {
                numeroValido: (val) =>
                  val === "" || !Number.isNaN(Number(val)) || "Debe ser un número válido",
                noNegativo: (val) =>
                  val === "" || Number(val) >= 0 || "No puede ser negativo",
              },
            })}
          />
          <p className="mt-1.5 text-xs text-slate-500">
            Con 0 se elimina la alerta de stock bajo para este producto.
          </p>
        </div>
      </div>
    </form>
  );
}