import * as React from "react";
import { useForm } from "react-hook-form";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "../../components/ui/Modal";
import { FieldError } from "../../components/ui/FieldError";
import { CapitalizedInput } from "../../components/ui/CapitalizedInput";
import { cn } from "../../lib/cn";
import { productosService } from "../../services/productos.service";
import type { Categoria, Producto, TipoVenta, UnidadMedida } from "../../../electron/db/types";

export interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (nuevoProducto?: Producto) => void;
  categorias: Categoria[];
}

export interface FormValues {
  nombre: string;
  codigoInterno: string;
  codigosBarras?: string;
  categoriaId: number;
  tipoVenta: TipoVenta;
  unidadMedida: UnidadMedida;
  costo: number;
  precioVenta: number;
  precioMayoreo: number;
  stockActual: number;
  stockMinimo: number;
  vencimiento?: string;
}

export function CreateProductModal({
  isOpen,
  onClose,
  onSuccess,
  categorias,
}: CreateProductModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      nombre: "",
      codigoInterno: "",
      codigosBarras: "",
      categoriaId: 0,
      tipoVenta: "unidad",
      unidadMedida: "unidad",
      costo: 0,
      precioVenta: 0,
      precioMayoreo: 0,
      stockActual: 0,
      stockMinimo: 5,
      vencimiento: "",
    },
  });

  React.useEffect(() => {
    if (isOpen) reset();
  }, [isOpen, reset]);

  const generarCodigoInternoSugerido = () => {
    const timestamp = Date.now().toString().slice(-4);
    const aleatorio = Math.floor(100 + Math.random() * 900);
    const codigoSugerido = `ART-${timestamp}${aleatorio}`;
    setValue("codigoInterno", codigoSugerido, { shouldValidate: true });
    toast.info(`Código interno sugerido: ${codigoSugerido}`);
  };

  const onSubmit = async (data: FormValues) => {
    try {
      const payload = {
        ...data,
        nombre: data.nombre.trim(),
        codigoInterno: data.codigoInterno.trim(),
        codigosBarras: data.codigosBarras?.trim() || null,
        vencimiento: data.vencimiento?.trim() || null,
        categoriaId: Number(data.categoriaId) > 0 ? Number(data.categoriaId) : null,
      };

      const nuevoProducto = await productosService.create(payload);

      toast.success("Producto creado exitosamente");
      onSuccess?.(nuevoProducto);
      onClose();
    } catch (error: unknown) {
      console.error("Error al crear producto:", error);
      const mensaje = error instanceof Error ? error.message : "Error al crear el producto";

      if (
        mensaje.toLowerCase().includes("unique") &&
        mensaje.toLowerCase().includes("codigo_interno")
      ) {
        setError("codigoInterno", {
          type: "manual",
          message: "Este código interno ya está en uso",
        });
        toast.error("El código interno ya existe en otro producto");
      } else {
        toast.error(mensaje);
      }
    }
  };

  return (
    <Modal isOpen={isOpen} maxWidth="lg" onClose={onClose} title="Nuevo Producto">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Campo: Nombre del Producto (Usa CapitalizedInput obligatorio) */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="nombre"
            className="ml-1 text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Nombre del producto <span className="text-red-500">*</span>
          </label>
          <CapitalizedInput
            id="nombre"
            type="text"
            autoFocus
            disabled={isSubmitting}
            placeholder="Ej. Shampoo neutro 1L"
            {...register("nombre", {
              required: "El nombre es obligatorio",
              minLength: {
                value: 3,
                message: "Mínimo 3 caracteres",
              },
              maxLength: {
                value: 60,
                message: "Máximo 60 caracteres",
              },
            })}
            className={cn(
              "h-10 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 dark:bg-[#0B1120] dark:text-slate-100 dark:placeholder:text-slate-600",
              errors.nombre
                ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                : "border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700/80",
            )}
          />
          <FieldError error={errors.nombre?.message} />
        </div>

        {/* Fila: Código Interno y Códigos de Barra */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between ml-1">
              <label
                htmlFor="codigoInterno"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Código interno <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={generarCodigoInternoSugerido}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 cursor-pointer disabled:opacity-50"
                title="Generar código sugerido"
              >
                <Sparkles className="h-3 w-3" />
                <span>Autogenerar</span>
              </button>
            </div>
            <input
              id="codigoInterno"
              type="text"
              disabled={isSubmitting}
              placeholder="Ej. 101 o ART-01"
              {...register("codigoInterno", {
                required: "El código interno es obligatorio",
                maxLength: {
                  value: 30,
                  message: "Máximo 30 caracteres",
                },
              })}
              className={cn(
                "h-10 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 dark:bg-[#0B1120] dark:text-slate-100 dark:placeholder:text-slate-600",
                errors.codigoInterno
                  ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                  : "border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700/80",
              )}
            />
            <FieldError error={errors.codigoInterno?.message} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="codigosBarras"
              className="ml-1 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Códigos de barra (CSV)
            </label>
            <input
              id="codigosBarras"
              type="text"
              disabled={isSubmitting}
              placeholder="Ej. 779001, 779002"
              {...register("codigosBarras", {
                maxLength: {
                  value: 255,
                  message: "Máximo 255 caracteres",
                },
              })}
              className={cn(
                "h-10 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 dark:bg-[#0B1120] dark:text-slate-100 dark:placeholder:text-slate-600",
                errors.codigosBarras
                  ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                  : "border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700/80",
              )}
            />
            <FieldError error={errors.codigosBarras?.message} />
          </div>
        </div>

        {/* Fila: Categoría y Tipo de Venta */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="categoriaId"
              className="ml-1 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Categoría <span className="text-red-500">*</span>
            </label>
            <select
              id="categoriaId"
              disabled={isSubmitting}
              {...register("categoriaId", {
                required: "Selecciona una categoría",
                valueAsNumber: true,
                min: { value: 1, message: "Categoría inválida" },
              })}
              className={cn(
                "h-10 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none transition-all dark:bg-[#0B1120] dark:text-slate-100",
                errors.categoriaId
                  ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                  : "border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700/80",
              )}
            >
              <option value={0} disabled>
                Seleccionar categoría...
              </option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre}
                </option>
              ))}
            </select>
            <FieldError error={errors.categoriaId?.message} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="tipoVenta"
              className="ml-1 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Tipo de venta
            </label>
            <select
              id="tipoVenta"
              disabled={isSubmitting}
              {...register("tipoVenta")}
              className={cn(
                "h-10 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none transition-all dark:bg-[#0B1120] dark:text-slate-100",
                "border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700/80",
              )}
            >
              <option value="unidad">Por unidad</option>
              <option value="granel">Por peso / granel</option>
              <option value="kit">Kit / combo</option>
            </select>
          </div>
        </div>

        {/* Fila: Precios (Costo, Precio Venta y Mayoreo) */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="costo"
              className="ml-1 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Costo unitario ($)
            </label>
            <input
              id="costo"
              type="number"
              step="0.01"
              disabled={isSubmitting}
              {...register("costo", {
                valueAsNumber: true,
                min: { value: 0, message: "No puede ser negativo" },
              })}
              className={cn(
                "h-10 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none transition-all dark:bg-[#0B1120] dark:text-slate-100",
                errors.costo
                  ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                  : "border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700/80",
              )}
            />
            <FieldError error={errors.costo?.message} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="precioVenta"
              className="ml-1 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Precio de venta ($) <span className="text-red-500">*</span>
            </label>
            <input
              id="precioVenta"
              type="number"
              step="0.01"
              disabled={isSubmitting}
              {...register("precioVenta", {
                required: "El precio de venta es obligatorio",
                valueAsNumber: true,
                min: { value: 0, message: "No puede ser negativo" },
              })}
              className={cn(
                "h-10 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none transition-all dark:bg-[#0B1120] dark:text-slate-100",
                errors.precioVenta
                  ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                  : "border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700/80",
              )}
            />
            <FieldError error={errors.precioVenta?.message} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="precioMayoreo"
              className="ml-1 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Precio mayoreo ($)
            </label>
            <input
              id="precioMayoreo"
              type="number"
              step="0.01"
              disabled={isSubmitting}
              {...register("precioMayoreo", {
                valueAsNumber: true,
                min: { value: 0, message: "No puede ser negativo" },
              })}
              className={cn(
                "h-10 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none transition-all dark:bg-[#0B1120] dark:text-slate-100",
                errors.precioMayoreo
                  ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                  : "border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700/80",
              )}
            />
            <FieldError error={errors.precioMayoreo?.message} />
          </div>
        </div>

        {/* Fila: Stock Inicial, Stock Mínimo y Vencimiento */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="stockActual"
              className="ml-1 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Stock inicial <span className="text-red-500">*</span>
            </label>
            <input
              id="stockActual"
              type="number"
              step="any"
              disabled={isSubmitting}
              {...register("stockActual", {
                required: "El stock inicial es obligatorio",
                valueAsNumber: true,
                min: { value: 0, message: "No puede ser negativo" },
                validate: (val) => !isNaN(val) || "Debe ser un número válido",
              })}
              className={cn(
                "h-10 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none transition-all dark:bg-[#0B1120] dark:text-slate-100",
                errors.stockActual
                  ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                  : "border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700/80",
              )}
            />
            <FieldError error={errors.stockActual?.message} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="stockMinimo"
              className="ml-1 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Stock mínimo
            </label>
            <input
              id="stockMinimo"
              type="number"
              step="any"
              disabled={isSubmitting}
              {...register("stockMinimo", {
                valueAsNumber: true,
                min: { value: 0, message: "No puede ser negativo" },
                validate: (val) => !isNaN(val) || "Debe ser un número válido",
              })}
              className={cn(
                "h-10 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none transition-all dark:bg-[#0B1120] dark:text-slate-100",
                errors.stockMinimo
                  ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                  : "border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700/80",
              )}
            />
            <FieldError error={errors.stockMinimo?.message} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="vencimiento"
              className="ml-1 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Vencimiento
            </label>
            <input
              id="vencimiento"
              type="date"
              disabled={isSubmitting}
              {...register("vencimiento")}
              className={cn(
                "h-10 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none transition-all dark:bg-[#0B1120] dark:text-slate-100",
                "border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700/80",
              )}
            />
          </div>
        </div>

        {/* Acciones del formulario */}
        <div className="mt-2 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800/60">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex min-w-[140px] cursor-pointer items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs shadow-emerald-900/20 transition-all hover:bg-emerald-500 active:scale-95 disabled:opacity-70 disabled:active:scale-100"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Guardar producto"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
