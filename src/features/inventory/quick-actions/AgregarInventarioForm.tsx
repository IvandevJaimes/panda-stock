import { Controller, useForm, useWatch, type DefaultValues } from "react-hook-form";
import { toast } from "sonner";
import { CapitalizedInput } from "../../../components/ui/CapitalizedInput";
import { DateInput } from "../../../components/ui/DateInput";
import { FieldError } from "../../../components/ui/FieldError";
import { Input } from "../../../components/ui/Input";
import { cn } from "../../../lib/cn";
import { movimientosService } from "../../../services/movimientos.service";
import type { Producto } from "../../../../electron/db/types";
import { HeaderMini } from "./HeaderMini";
import { ACCION_LABEL, FORM_ID, noSpinnersClass } from "./types";

interface AgregarInventarioValues {
  cantidad: string;
  costoUnitario: string;
  fechaVencimiento: string;
  motivo: string;
}

const VALORES_INICIALES_AGREGAR: DefaultValues<AgregarInventarioValues> = {
  cantidad: "",
  costoUnitario: "",
  fechaVencimiento: "",
  motivo: "",
};

interface AgregarInventarioFormProps {
  producto: Producto;
  onCancel: () => void;
  onSuccess: () => void;
  onSubmittingChange: (submitting: boolean) => void;
}

export function AgregarInventarioForm({ producto, onCancel, onSuccess, onSubmittingChange }: AgregarInventarioFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AgregarInventarioValues>({
    defaultValues: VALORES_INICIALES_AGREGAR,
  });

  const motivo = useWatch({ control, name: "motivo" }) ?? "";

  const onSubmit = async (data: AgregarInventarioValues) => {
    onSubmittingChange(true);
    try {
      await movimientosService.crearMovimiento({
        productoId: producto.id,
        tipo: "entrada",
        cantidad: Number(data.cantidad),
        costoUnitario: data.costoUnitario !== "" ? Number(data.costoUnitario) : undefined,
        motivo: data.motivo.trim(),
        fechaVencimiento: data.fechaVencimiento || null,
      });
      toast.success("Inventario agregado correctamente. Nuevo lote creado.");
      onSuccess();
    } catch (error: unknown) {
      const mensaje = error instanceof Error ? error.message : String(error);
      toast.error(mensaje || "Error al agregar inventario");
    } finally {
      onSubmittingChange(false);
    }
  };

  return (
    <form
      id={FORM_ID["agregar-inventario"]}
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <HeaderMini
        producto={producto}
        titulo={ACCION_LABEL["agregar-inventario"]}
        onBack={onCancel}
      />
      <div className="space-y-4">
        <Input
          label="Cantidad a ingresar"
          type="number"
          step="any"
          min="1"
          autoFocus
          disabled={isSubmitting}
          error={errors.cantidad?.message}
          className={noSpinnersClass}
          {...register("cantidad", {
            required: "La cantidad es obligatoria",
            validate: {
              numeroValido: (val) =>
                !Number.isNaN(Number(val)) || "Debe ser un número válido",
              minimo: (val) => Number(val) >= 1 || "Debe ser al menos 1",
            },
          })}
        />
        <Input
          label="Costo unitario (Vacío = costo del lote activo)"
          type="number"
          step="0.01"
          min="0.01"
          disabled={isSubmitting}
          error={errors.costoUnitario?.message}
          className={noSpinnersClass}
          placeholder="Ej: 1250.50"
          {...register("costoUnitario", {
            validate: {
              numeroValido: (val) =>
                val.trim() === "" ||
                !Number.isNaN(Number(val)) ||
                "Debe ser un número válido",
              mayorQueCero: (val) =>
                val.trim() === "" ||
                Number(val) > 0 ||
                "Debe ser mayor a 0",
            },
          })}
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Fecha de Vencimiento (Opcional)
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
            placeholder="Ej: Compra de mercadería"
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
      </div>
    </form>
  );
}