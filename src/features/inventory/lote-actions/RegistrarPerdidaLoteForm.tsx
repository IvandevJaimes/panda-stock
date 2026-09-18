import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { CapitalizedInput } from "../../../components/ui/CapitalizedInput";
import { FieldError } from "../../../components/ui/FieldError";
import { Input } from "../../../components/ui/Input";
import { cn } from "../../../lib/cn";
import { formatearPrecio } from "../quick-actions/formatters";
import { movimientosService } from "../../../services/movimientos.service";
import type { Lote } from "../../../../electron/db/types";
import { HeaderLote } from "./HeaderLote";
import { BotonGestionarLotes } from "../quick-actions/BotonGestionarLotes";
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
  formId?: string;
  esLoteActivo?: boolean;
  onOpenLotes?: () => void;
  onCancel: () => void;
  onSuccess: () => void;
  onSubmittingChange: (submitting: boolean) => void;
}

export function RegistrarPerdidaLoteForm({
  lote,
  productoId,
  formId,
  esLoteActivo = false,
  onOpenLotes,
  onCancel,
  onSuccess,
  onSubmittingChange,
}: RegistrarPerdidaLoteFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegistrarPerdidaLoteValues>({
    defaultValues: VALORES_INICIALES_PERDIDA,
  });

  const cantidad = useWatch({ control, name: "cantidad" }) ?? "";
  const motivo = useWatch({ control, name: "motivo" }) ?? "";
  const cantidadNum = cantidad !== "" ? Number(cantidad) : NaN;
  const cantidadValida = !Number.isNaN(cantidadNum) && cantidadNum >= 1;
  const cantidadEfectiva = cantidadValida
    ? Math.min(cantidadNum, lote.cantidadActual)
    : 0;
  const perdidaEfectiva = cantidadEfectiva * lote.costoUnitario;

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
      id={formId ?? FORM_ID_LOTE["registrar-perdida"]}
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <HeaderLote
        lote={lote}
        titulo={ACCION_LABEL_LOTE["registrar-perdida"]}
        onBack={onCancel}
        esLoteActivo={esLoteActivo}
      />
      <div className="space-y-4">
        <Input
          label={`Disponible para descontar: ${lote.cantidadActual} und`}
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
                `No puede superar el stock del lote (${lote.cantidadActual} und)`,
            },
          })}
        />
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="motivo"
            className="ml-1 text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Motivo (Opcional)
          </label>
          <CapitalizedInput
            id="motivo"
            type="text"
            disabled={isSubmitting}
            placeholder="Ej: Rotura en traslado, Producto vencido"
            value={motivo}
            className={cn(
              "border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700/80",
              errors.motivo &&
                "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10",
            )}
            onClear={() => setValue("motivo", "")}
            {...register("motivo")}
          />
          <FieldError error={errors.motivo?.message} />
        </div>
        {cantidadValida && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 dark:border-red-500/15">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Resumen del descuento
            </p>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-600 dark:text-slate-300">
                Se descontarán{" "}
                <span className="font-bold text-slate-900 dark:text-white">
                  {cantidadEfectiva}
                </span>{" "}
                {cantidadEfectiva === 1 ? "unidad" : "unidades"}
              </span>
              <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                Pérdida estimada: {formatearPrecio(perdidaEfectiva)}
              </span>
            </div>
          </div>
        )}
      </div>
      {onOpenLotes && (
        <>
          <hr className="my-4 border-slate-100 dark:border-slate-800" />
          <BotonGestionarLotes onOpenLotes={onOpenLotes} />
        </>
      )}
    </form>
  );
}