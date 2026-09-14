import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Input } from "../../../components/ui/Input";
import { movimientosService } from "../../../services/movimientos.service";
import type { Lote } from "../../../../electron/db/types";
import { HeaderLote } from "./HeaderLote";
import { noSpinnersClass } from "../quick-actions/types";
import { ACCION_LABEL_LOTE, FORM_ID_LOTE } from "./types";

interface RegistrarPerdidaLoteValues {
  cantidad: string;
  motivo: string;
}

const VALORES_INICIALES_PERDIDA = {
  cantidad: "",
  motivo: "",
} as const;

interface RegistrarPerdidaLoteFormProps {
  lote: Lote;
  productoId: number;
  onCancel: () => void;
  onSuccess: () => void;
  onSubmittingChange: (submitting: boolean) => void;
}

export function RegistrarPerdidaLoteForm({
  lote,
  productoId,
  onCancel,
  onSuccess,
  onSubmittingChange,
}: RegistrarPerdidaLoteFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistrarPerdidaLoteValues>({
    defaultValues: VALORES_INICIALES_PERDIDA,
  });

  const onSubmit = async (data: RegistrarPerdidaLoteValues) => {
    onSubmittingChange(true);
    try {
      await movimientosService.crearMovimiento({
        productoId,
        loteId: lote.id,
        tipo: "merma",
        cantidad: Number(data.cantidad),
        motivo: data.motivo.trim(),
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
      id={FORM_ID_LOTE["registrar-perdida"]}
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <HeaderLote
        lote={lote}
        titulo={ACCION_LABEL_LOTE["registrar-perdida"]}
        onBack={onCancel}
      />
      <div className="space-y-4">
        <Input
          label={`Disponible para descontar: ${lote.cantidadActual}`}
          type="number"
          step="any"
          min="1"
          max={lote.cantidadActual}
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
                Number(val) <= lote.cantidadActual ||
                `No puede superar el stock del lote (${lote.cantidadActual})`,
            },
          })}
        />
        <Input
          label="Motivo"
          type="text"
          disabled={isSubmitting}
          error={errors.motivo?.message}
          placeholder="Ej: Rotura en traslado, Producto vencido"
          {...register("motivo")}
        />
      </div>
    </form>
  );
}