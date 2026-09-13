import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Input } from "../../../components/ui/Input";
import { movimientosService } from "../../../services/movimientos.service";
import type { Lote, Producto } from "../../../../electron/db/types";
import { HeaderMini } from "./HeaderMini";
import { BotonGestionarLotes, PanelLoteAfectado } from "./LoteAfectado";
import { ACCION_LABEL, FORM_ID, noSpinnersClass } from "./types";

interface RegistrarPerdidaValues {
  cantidad: string;
  motivo: string;
}

const VALORES_INICIALES_PERDIDA = {
  cantidad: "",
  motivo: "",
} as const;

interface RegistrarPerdidaFormProps {
  producto: Producto;
  lote: Lote | null;
  onCancel: () => void;
  onSuccess: () => void;
  onSubmittingChange: (submitting: boolean) => void;
  onOpenLotes: () => void;
}

export function RegistrarPerdidaForm({ producto, lote, onCancel, onSuccess, onSubmittingChange, onOpenLotes }: RegistrarPerdidaFormProps) {
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
        loteId: lote?.id ?? null,
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
        <PanelLoteAfectado lote={lote} />
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
      </div>
      <hr className="my-4 border-slate-100 dark:border-slate-800" />
      <BotonGestionarLotes onOpenLotes={onOpenLotes} />
    </form>
  );
}