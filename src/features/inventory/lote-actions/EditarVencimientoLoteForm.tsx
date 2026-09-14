import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { DateInput } from "../../../components/ui/DateInput";
import { FieldError } from "../../../components/ui/FieldError";
import { lotesService } from "../../../services/lotes.service";
import type { Lote } from "../../../../electron/db/types";
import { HeaderLote } from "./HeaderLote";
import { ACCION_LABEL_LOTE, FORM_ID_LOTE } from "./types";

interface EditarVencimientoLoteValues {
  fechaVencimiento: string;
}

interface EditarVencimientoLoteFormProps {
  lote: Lote;
  onCancel: () => void;
  onSuccess: () => void;
  onSubmittingChange: (submitting: boolean) => void;
}

export function EditarVencimientoLoteForm({
  lote,
  onCancel,
  onSuccess,
  onSubmittingChange,
}: EditarVencimientoLoteFormProps) {
  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EditarVencimientoLoteValues>({
    defaultValues: { fechaVencimiento: lote.fechaVence ?? "" },
  });

  const onSubmit = async (data: EditarVencimientoLoteValues) => {
    onSubmittingChange(true);
    try {
      await lotesService.update(lote.id, {
        fechaVence: data.fechaVencimiento.trim() || null,
      });
      toast.success("Fecha de vencimiento actualizada");
      onSuccess();
    } catch (error: unknown) {
      const mensaje = error instanceof Error ? error.message : String(error);
      toast.error(mensaje || "Error al actualizar vencimiento");
    } finally {
      onSubmittingChange(false);
    }
  };

  return (
    <form
      id={FORM_ID_LOTE["editar-vencimiento"]}
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <HeaderLote
        lote={lote}
        titulo={ACCION_LABEL_LOTE["editar-vencimiento"]}
        onBack={onCancel}
      />
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Fecha de Vencimiento
          </label>
          <Controller
            name="fechaVencimiento"
            control={control}
            render={({ field, fieldState }) => (
              <DateInput
                id="fechaVencimiento"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                error={!!fieldState.error}
                disabled={isSubmitting}
                placeholder="DD/MM/YYYY"
                placement="top-end"
                className="w-full"
              />
            )}
          />
          <FieldError error={errors.fechaVencimiento?.message} />
        </div>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Dejá el campo vacío para quitar la fecha de vencimiento del lote.
        </p>
      </div>
    </form>
  );
}