import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { productosService } from "../../../services/productos.service";
import type { Producto } from "../../../../electron/db/types";
import { HeaderMini } from "./HeaderMini";
import { ACCION_LABEL, FORM_ID } from "./types";

interface EditarVarianteValues {
  nuevaVariante: string;
}

interface EditarVarianteFormProps {
  producto: Producto;
  varianteInicial: string;
  onCancel: () => void;
  onSuccess: () => void;
  onSubmittingChange: (submitting: boolean) => void;
}

export function EditarVarianteForm({ producto, varianteInicial, onCancel, onSuccess, onSubmittingChange }: EditarVarianteFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EditarVarianteValues>({
    defaultValues: { nuevaVariante: varianteInicial },
  });

  const onSubmit = async (data: EditarVarianteValues) => {
    onSubmittingChange(true);
    try {
      await productosService.updateVariante(
        producto.id,
        data.nuevaVariante.trim() || null,
      );
      toast.success("Variante actualizada correctamente");
      onSuccess();
    } catch (error: unknown) {
      const mensaje = error instanceof Error ? error.message : String(error);
      toast.error(mensaje || "Error al actualizar variante");
    } finally {
      onSubmittingChange(false);
    }
  };

  return (
    <form
      id={FORM_ID["variante-detalle"]}
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <HeaderMini
        producto={producto}
        titulo={ACCION_LABEL["variante-detalle"]}
        onBack={onCancel}
      />
      <div className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <Input
            label="Variante / Detalle"
            type="text"
            autoFocus
            disabled={isSubmitting}
            error={errors.nuevaVariante?.message}
            placeholder='Ej. "500ml", "Rojo", "Anticaída", "Pack x3"'
            rightAction={
              <Button
                type="button"
                variant="ghost"
                className="h-full rounded-l-none"
                onClick={() => setValue("nuevaVariante", "")}
              >
                Limpiar
              </Button>
            }
            {...register("nuevaVariante", {
              maxLength: {
                value: 40,
                message: "Máximo 40 caracteres",
              },
            })}
          />
        </div>
      </div>
    </form>
  );
}