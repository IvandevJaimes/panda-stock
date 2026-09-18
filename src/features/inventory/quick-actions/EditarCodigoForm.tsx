import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Input } from "../../../components/ui/Input";
import { Tooltip } from "../../../components/ui/Tooltip";
import { productosService } from "../../../services/productos.service";
import type { Producto } from "../../../../electron/db/types";
import { HeaderMini } from "./HeaderMini";
import { ACCION_LABEL, FORM_ID } from "./types";

interface EditarCodigoValues {
  nuevoCodigo: string;
}

interface EditarCodigoFormProps {
  producto: Producto;
  codigoInicial: string;
  onCancel: () => void;
  onSuccess: () => void;
  onSubmittingChange: (submitting: boolean) => void;
  onCanSaveChange?: (canSave: boolean) => void;
}

export function EditarCodigoForm({ producto, codigoInicial, onCancel, onSuccess, onSubmittingChange, onCanSaveChange }: EditarCodigoFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EditarCodigoValues>({
    defaultValues: { nuevoCodigo: codigoInicial },
  });

  const nuevoCodigo = useWatch({ control, name: "nuevoCodigo" }) ?? "";

  useEffect(() => {
    onCanSaveChange?.(
      nuevoCodigo.trim().toUpperCase() !== codigoInicial.trim().toUpperCase(),
    );
  }, [nuevoCodigo, codigoInicial, onCanSaveChange]);

  const generarCodigoSugerido = () => {
    const codigoSugerido = String(Math.floor(1000 + Math.random() * 9000));
    setValue("nuevoCodigo", codigoSugerido, { shouldValidate: true });
    toast.info(`Código sugerido: ${codigoSugerido}`);
  };

  const onSubmit = async (data: EditarCodigoValues) => {
    onSubmittingChange(true);
    try {
      await productosService.updateCodigo(
        producto.id,
        data.nuevoCodigo.trim().toUpperCase(),
      );
      toast.success("Código actualizado correctamente");
      onSuccess();
    } catch (error: unknown) {
      const mensaje = error instanceof Error ? error.message : String(error);
      toast.error(mensaje || "Error al actualizar código");
    } finally {
      onSubmittingChange(false);
    }
  };

  return (
    <form
      id={FORM_ID["editar-codigo"]}
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <HeaderMini
        producto={producto}
        titulo={ACCION_LABEL["editar-codigo"]}
        onBack={onCancel}
      />
      <div className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <Input
            label="Código (Interno o de Barras)"
            type="text"
            autoFocus
            disabled={isSubmitting}
            error={errors.nuevoCodigo?.message}
            value={nuevoCodigo}
            className="font-mono uppercase"
            labelAction={
              <Tooltip content="Generar código sugerido">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={generarCodigoSugerido}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Autogenerar</span>
                </button>
              </Tooltip>
            }
            onClear={() =>
              setValue("nuevoCodigo", "", { shouldValidate: true })
            }
            {...register("nuevoCodigo", {
              maxLength: {
                value: 30,
                message: "Máximo 30 caracteres",
              },
            })}
          />
        </div>
      </div>
    </form>
  );
}