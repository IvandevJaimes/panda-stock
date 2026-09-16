import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Input } from "../../../components/ui/Input";
import { lotesService } from "../../../services/lotes.service";
import { formatearPrecio } from "../quick-actions/formatters";
import type { Lote } from "../../../../electron/db/types";
import { HeaderLote } from "./HeaderLote";
import { noSpinnersClass } from "../quick-actions/types";
import { ACCION_LABEL_LOTE, FORM_ID_LOTE } from "./types";

interface EditarCostoLoteValues {
  nuevoCosto: string;
}

interface EditarCostoLoteFormProps {
  lote: Lote;
  onCancel: () => void;
  onSuccess: () => void;
  onSubmittingChange: (submitting: boolean) => void;
  onCanSaveChange?: (canSave: boolean) => void;
}

export function EditarCostoLoteForm({
  lote,
  onCancel,
  onSuccess,
  onSubmittingChange,
  onCanSaveChange,
}: EditarCostoLoteFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EditarCostoLoteValues>({
    defaultValues: { nuevoCosto: String(lote.costoUnitario) },
  });

  const nuevoCosto = useWatch({ control, name: "nuevoCosto" }) ?? "";
  const nuevoCostoNum = nuevoCosto !== "" ? Number(nuevoCosto) : NaN;

  useEffect(() => {
    const esValido = !Number.isNaN(nuevoCostoNum) && nuevoCostoNum > 0;
    onCanSaveChange?.(esValido && nuevoCostoNum !== lote.costoUnitario);
  }, [nuevoCostoNum, lote.costoUnitario, onCanSaveChange]);

  const onSubmit = async (data: EditarCostoLoteValues) => {
    onSubmittingChange(true);
    try {
      const valor = Number(data.nuevoCosto);
      if (valor === lote.costoUnitario) {
        toast.info("El costo es el mismo");
        return;
      }
      await lotesService.update(lote.id, { costoUnitario: valor });
      toast.success(`Costo actualizado a ${formatearPrecio(valor)}`);
      onSuccess();
    } catch (error: unknown) {
      const mensaje = error instanceof Error ? error.message : String(error);
      toast.error(mensaje || "Error al actualizar costo");
    } finally {
      onSubmittingChange(false);
    }
  };

  return (
    <form
      id={FORM_ID_LOTE["editar-costo"]}
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <HeaderLote
        lote={lote}
        titulo={ACCION_LABEL_LOTE["editar-costo"]}
        onBack={onCancel}
      />
      <div className="space-y-4">
        <div>
          <Input
            label={`Costo actual: ${formatearPrecio(lote.costoUnitario)}`}
            type="number"
            step="0.01"
            min="0.01"
            autoFocus
            disabled={isSubmitting}
            error={errors.nuevoCosto?.message}
            className={noSpinnersClass}
            placeholder="Ej: 1250.50"
            {...register("nuevoCosto", {
              required: "El costo de entrada es obligatorio",
              validate: {
                numeroValido: (val) =>
                  !Number.isNaN(Number(val)) || "Debe ser un número válido",
                mayorQueCero: (val) => Number(val) > 0 || "Debe ser mayor a 0",
              },
            })}
          />
        </div>
      </div>
    </form>
  );
}