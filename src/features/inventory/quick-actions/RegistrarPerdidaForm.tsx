import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Input } from "../../../components/ui/Input";
import { movimientosService } from "../../../services/movimientos.service";
import type { Producto } from "../../../../electron/db/types";
import { HeaderMini } from "./HeaderMini";
import { ACCION_LABEL, FORM_ID, noSpinnersClass } from "./types";

interface RegistrarPerdidaValues {
  cantidad: string;
  motivo: string;
  observaciones: string;
}

const VALORES_INICIALES_PERDIDA = {
  cantidad: "",
  motivo: "",
  observaciones: "",
} as const;

interface RegistrarPerdidaFormProps {
  producto: Producto;
  loteId: number | null;
  onCancel: () => void;
  onSuccess: () => void;
  onSubmittingChange: (submitting: boolean) => void;
}

export function RegistrarPerdidaForm({ producto, loteId, onCancel, onSuccess, onSubmittingChange }: RegistrarPerdidaFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistrarPerdidaValues>({
    defaultValues: VALORES_INICIALES_PERDIDA,
  });

  const onSubmit = async (data: RegistrarPerdidaValues) => {
    onSubmittingChange(true);
    try {
      await movimientosService.crearMovimiento({
        productoId: producto.id,
        loteId,
        tipo: "merma",
        cantidad: Number(data.cantidad),
        motivo:
          data.motivo.trim() +
          (data.observaciones.trim() ? ` - ${data.observaciones.trim()}` : ""),
      });
      toast.success("Pérdida registrada correctamente");
      onSuccess();
    } catch (error: unknown) {
      const mensaje = error instanceof Error ? error.message : String(error);
      toast.error(mensaje || "Error al registrar pérdida");
    } finally {
      onSubmittingChange(false);
    }
  };

  return (
    <form
      id={FORM_ID["registrar-perdida"]}
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <HeaderMini
        producto={producto}
        titulo={ACCION_LABEL["registrar-perdida"]}
        onBack={onCancel}
      />
      <div className="space-y-4">
        <Input
          label="Cantidad Perdida"
          type="number"
          step="any"
          min="1"
          max={producto.stockActual}
          autoFocus
          disabled={isSubmitting}
          error={errors.cantidad?.message}
          className={noSpinnersClass}
          {...register("cantidad", {
            required: "La cantidad perdida es obligatoria",
            validate: {
              numeroValido: (val) =>
                !Number.isNaN(Number(val)) || "Debe ser un número válido",
              minimo: (val) => Number(val) >= 1 || "Debe ser al menos 1",
              noMayorQueStock: (val) =>
                Number(val) <= producto.stockActual ||
                `No puede superar el stock actual (${producto.stockActual})`,
            },
          })}
        />
        <Input
          label="Motivo"
          type="text"
          disabled={isSubmitting}
          error={errors.motivo?.message}
          placeholder="Ej: Rotura en traslado, Producto vencido"
          {...register("motivo", {
            required: "Ingrese el motivo de la pérdida",
          })}
        />
        <Input
          label="Observaciones (Opcional)"
          type="text"
          disabled={isSubmitting}
          error={errors.observaciones?.message}
          {...register("observaciones", {})}
        />
      </div>
    </form>
  );
}