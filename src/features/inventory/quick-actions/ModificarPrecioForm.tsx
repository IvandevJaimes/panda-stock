import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Input } from "../../../components/ui/Input";
import { MargenGananciaHint } from "../../../components/ui/MargenGananciaHint";
import { productosService } from "../../../services/productos.service";
import type { Producto } from "../../../../electron/db/types";
import { HeaderMini } from "./HeaderMini";
import { formatearPrecio } from "./formatters";
import { ACCION_LABEL, FORM_ID, noSpinnersClass } from "./types";

interface ModificarPrecioValues {
  nuevoPrecio: string;
}

interface ModificarPrecioFormProps {
  producto: Producto;
  precioInicial: number;
  onCancel: () => void;
  onSuccess: () => void;
  onSubmittingChange: (submitting: boolean) => void;
  onCanSaveChange?: (canSave: boolean) => void;
}

export function ModificarPrecioForm({ producto, precioInicial, onCancel, onSuccess, onSubmittingChange, onCanSaveChange }: ModificarPrecioFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ModificarPrecioValues>({
    defaultValues: { nuevoPrecio: String(precioInicial) },
  });

  const nuevoPrecio = useWatch({ control, name: "nuevoPrecio" }) ?? "";
  const nuevoPrecioNum = nuevoPrecio !== "" ? Number(nuevoPrecio) : NaN;
  const precioValido = !Number.isNaN(nuevoPrecioNum) && nuevoPrecioNum > 0;
  const hayCambio = nuevoPrecioNum !== precioInicial;

  useEffect(() => {
    onCanSaveChange?.(precioValido && hayCambio);
  }, [precioValido, hayCambio, onCanSaveChange]);

  const onSubmit = async (data: ModificarPrecioValues) => {
    onSubmittingChange(true);
    try {
      await productosService.updatePrecio(producto.id, Number(data.nuevoPrecio));
      toast.success(`Precio actualizado a ${formatearPrecio(Number(data.nuevoPrecio))}`);
      onSuccess();
    } catch (error: unknown) {
      const mensaje = error instanceof Error ? error.message : String(error);
      toast.error(mensaje || "Error al modificar precio");
    } finally {
      onSubmittingChange(false);
    }
  };

  return (
    <form
      id={FORM_ID["precio-venta"]}
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <HeaderMini
        producto={producto}
        titulo={ACCION_LABEL["precio-venta"]}
        onBack={onCancel}
      />
      <div className="space-y-4">
        <div>
          <Input
            label="Nuevo Precio de Venta"
            type="number"
            step="0.01"
            min="0.01"
            autoFocus
            disabled={isSubmitting}
            error={errors.nuevoPrecio?.message}
            className={noSpinnersClass}
            {...register("nuevoPrecio", {
              required: "El precio de venta es obligatorio",
              validate: {
                numeroValido: (val) =>
                  !Number.isNaN(Number(val)) || "Debe ser un número válido",
                mayorQueCero: (val) => Number(val) > 0 || "Debe ser mayor a 0",
              },
            })}
          />
          {precioValido && (
            <>
              <p className="mt-1.5 text-xs text-slate-500">
                Mayoreo proyectado (-10%):{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {formatearPrecio(nuevoPrecioNum * 0.9)}
                </span>
              </p>
              <MargenGananciaHint
                costo={producto.costo}
                precio={nuevoPrecioNum}
              />
            </>
          )}
        </div>
      </div>
    </form>
  );
}