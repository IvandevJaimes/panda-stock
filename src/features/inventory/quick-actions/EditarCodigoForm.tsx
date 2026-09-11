import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
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
}

export function EditarCodigoForm({ producto, codigoInicial, onCancel, onSuccess, onSubmittingChange }: EditarCodigoFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EditarCodigoValues>({
    defaultValues: { nuevoCodigo: codigoInicial },
  });

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
            className="font-mono uppercase"
            rightAction={
              <Button
                type="button"
                variant="ghost"
                className="h-full rounded-l-none"
                onClick={() => setValue("nuevoCodigo", "")}
              >
                Limpiar
              </Button>
            }
            {...register("nuevoCodigo", {
              required: "El código es obligatorio",
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