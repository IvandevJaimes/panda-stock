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
  codigoInterno: string;
  codigosBarras: string;
}

interface EditarCodigoFormProps {
  producto: Producto;
  onCancel: () => void;
  onSuccess: () => void;
  onSubmittingChange: (submitting: boolean) => void;
  onCanSaveChange?: (canSave: boolean) => void;
}

export function EditarCodigoForm({
  producto,
  onCancel,
  onSuccess,
  onSubmittingChange,
  onCanSaveChange,
}: EditarCodigoFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EditarCodigoValues>({
    defaultValues: {
      codigoInterno: producto.codigoInterno ?? "",
      codigosBarras: producto.codigosBarras ?? "",
    },
  });

  const codigoInterno =
    useWatch({ control, name: "codigoInterno" }) ?? "";
  const codigosBarras =
    useWatch({ control, name: "codigosBarras" }) ?? "";

  const huboCambios =
    codigoInterno.trim().toUpperCase() !==
      (producto.codigoInterno ?? "").trim().toUpperCase() ||
    codigosBarras.trim() !==
      (producto.codigosBarras ?? "").trim();

  useEffect(() => {
    onCanSaveChange?.(huboCambios);
  }, [huboCambios, onCanSaveChange]);

  const generarCodigoSugerido = () => {
    const codigoSugerido = String(Math.floor(1000 + Math.random() * 9000));
    setValue("codigoInterno", codigoSugerido, { shouldValidate: true });
    toast.info(`Código sugerido: ${codigoSugerido}`);
  };

  const onSubmit = async (data: EditarCodigoValues) => {
    onSubmittingChange(true);
    try {
      await productosService.update(producto.id, {
        codigoInterno: data.codigoInterno.trim().toUpperCase(),
        codigosBarras: data.codigosBarras,
      });
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
        <Input
          label="Código interno"
          type="text"
          autoFocus
          disabled={isSubmitting}
          error={errors.codigoInterno?.message}
          value={codigoInterno}
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
            setValue("codigoInterno", "", { shouldValidate: true })
          }
          {...register("codigoInterno", {
            maxLength: {
              value: 20,
              message: "Máximo 20 caracteres",
            },
          })}
        />
        <Input
          label="Códigos de barra"
          type="text"
          disabled={isSubmitting}
          placeholder="Ej. 779001, 779002"
          error={errors.codigosBarras?.message}
          value={codigosBarras}
          onClear={() =>
            setValue("codigosBarras", "", { shouldValidate: true })
          }
          {...register("codigosBarras", {
            maxLength: {
              value: 100,
              message: "Máximo 100 caracteres",
            },
          })}
        />
      </div>
    </form>
  );
}