import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Barcode,
  ChevronRight,
  DollarSign,
  Layers,
  MinusCircle,
  Pencil,
  Plus,
  SlidersHorizontal,
  Tags,
} from "lucide-react";
import {
  Controller,
  useForm,
  useWatch,
  type DefaultValues,
} from "react-hook-form";
import { toast } from "sonner";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { FieldError } from "../../components/ui/FieldError";
import { DateInput } from "../../components/ui/DateInput";
import { Tooltip } from "../../components/ui/Tooltip";
import { cn } from "../../lib/cn";
import { lotesService } from "../../services/lotes.service";
import { movimientosService } from "../../services/movimientos.service";
import { productosService } from "../../services/productos.service";
import type { Lote, Producto } from "../../../electron/db/types";

export interface ProductQuickActionsModalProps {
  isOpen: boolean;
  product: Producto | null;
  marcaNombre: string;
  categoriaNombre: string;
  onClose: () => void;
  onFullEdit: () => void;
  onOpenLotes: () => void;
  onSuccess?: () => void;
}

function formatearCodigo(valor: string | null): string {
  if (!valor) return "—";
  const partes = valor.split(",").map((c) => c.trim()).filter(Boolean);
  return partes.length > 1 ? `${partes[0]} +${partes.length - 1}` : partes[0] ?? "—";
}

function formatearPrecio(valor: number): string {
  return `$${valor.toFixed(2)}`;
}

type QuickActionView = 
  | "menu" 
  | "agregar-inventario" 
  | "ajustar-stock" 
  | "registrar-perdida" 
  | "precio-venta" 
  | "editar-codigo" 
  | "variante-detalle";

const noSpinnersClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none outline-none focus:outline-none focus:ring-1 focus:ring-emerald-500/50";

const ACCION_LABEL: Record<Exclude<QuickActionView, "menu">, string> = {
  "agregar-inventario": "Agregar Inventario",
  "ajustar-stock": "Ajustar Stock",
  "registrar-perdida": "Registrar Pérdida",
  "precio-venta": "Modificar Precio de Venta",
  "editar-codigo": "Editar Código",
  "variante-detalle": "Editar Variante / Detalle",
};

interface HeaderMiniProps {
  producto: Producto;
  titulo: string;
  onBack: () => void;
}

function HeaderMini({ producto, titulo, onBack }: HeaderMiniProps) {
  return (
    <>
      <div className="mb-3 flex items-center gap-3">
        <Tooltip content="Volver al menú de acciones" placement="right">
          <button
            type="button"
            onClick={onBack}
            aria-label="Volver"
            className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Tooltip>
        <h3 className="min-w-0 truncate font-display text-lg font-bold text-slate-900 dark:text-white">
          {titulo}
        </h3>
      </div>
      <div className="mb-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <h4 className="truncate text-sm font-bold text-slate-900 dark:text-white">
              {producto.nombre}
              {producto.variante && (
                <span className="ml-1 font-normal text-slate-400 dark:text-slate-500">
                  · {producto.variante}
                </span>
              )}
            </h4>
            <div className="truncate text-xs text-slate-500">
              Stock actual: <span className="font-semibold text-slate-700 dark:text-slate-300">{producto.stockActual}</span> | 
              Código: <span className="font-mono">{formatearCodigo(producto.codigoInterno || producto.codigosBarras)}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

interface AgregarInventarioValues {
  cantidad: string;
  costoUnitario: string;
  numeroLote: string;
  fechaVencimiento: string;
  sinVencimiento: boolean;
  motivo: string;
}

const VALORES_INICIALES_AGREGAR: DefaultValues<AgregarInventarioValues> = {
  cantidad: "",
  costoUnitario: "",
  numeroLote: "",
  fechaVencimiento: "",
  sinVencimiento: false,
  motivo: "",
};

interface AgregarInventarioFormProps {
  producto: Producto;
  onCancel: () => void;
  onSuccess: () => void;
}

function AgregarInventarioForm({ producto, onCancel, onSuccess }: AgregarInventarioFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AgregarInventarioValues>({
    defaultValues: VALORES_INICIALES_AGREGAR,
  });

  const sinVencimiento = useWatch({ control, name: "sinVencimiento" });

  const onSubmit = async (data: AgregarInventarioValues) => {
    try {
      await movimientosService.crearMovimiento({
        productoId: producto.id,
        tipo: "entrada",
        cantidad: Number(data.cantidad),
        costoUnitario: data.costoUnitario !== "" ? Number(data.costoUnitario) : undefined,
        motivo: data.motivo.trim(),
        numeroLote: data.numeroLote.trim() || null,
        fechaVencimiento: data.sinVencimiento ? null : data.fechaVencimiento,
      });
      toast.success("Inventario agregado correctamente. Nuevo lote creado.");
      onSuccess();
    } catch (error: unknown) {
      const mensaje = error instanceof Error ? error.message : String(error);
      toast.error(mensaje || "Error al agregar inventario");
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)}>
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
          label="Costo unitario (Opcional)"
          type="number"
          step="0.01"
          min="0"
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
              noNegativo: (val) =>
                val.trim() === "" || Number(val) >= 0 || "No puede ser negativo",
            },
          })}
        />
        <Input
          label="Número de Lote / Partida (Opcional)"
          type="text"
          disabled={isSubmitting}
          error={errors.numeroLote?.message}
          placeholder="Opcional. Se identifica como 'Lote #id' si se omite"
          {...register("numeroLote", {
            maxLength: {
              value: 40,
              message: "Máximo 40 caracteres",
            },
          })}
        />
        <div>
          <div className="mb-1.5 flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300">
            <span>Fecha de Vencimiento</span>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs font-normal">
              <input
                type="checkbox"
                disabled={isSubmitting}
                {...register("sinVencimiento")}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
              />
              Sin vencimiento
            </label>
          </div>
          <Controller
            name="fechaVencimiento"
            control={control}
            rules={{
              validate: (val) => {
                if (sinVencimiento) return true;
                return val
                  ? true
                  : "Ingrese una fecha de vencimiento o marque 'Sin vencimiento'";
              },
            }}
            render={({ field, fieldState }) => (
              <>
                {!sinVencimiento && (
                  <DateInput
                    id="fechaVencimiento"
                    name={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    error={!!fieldState.error}
                    disabled={isSubmitting}
                    placeholder="DD/MM/YYYY"
                    className="w-full"
                  />
                )}
              </>
            )}
          />
          <FieldError error={errors.fechaVencimiento?.message} />
        </div>
        <Input
          label="Motivo"
          type="text"
          disabled={isSubmitting}
          error={errors.motivo?.message}
          placeholder="Ej: Compra de mercadería"
          {...register("motivo", {
            required: "Ingrese un motivo para la entrada",
          })}
        />
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" loading={isSubmitting}>
          Confirmar
        </Button>
      </div>
    </form>
  );
}

interface AjustarStockValues {
  cantidad: string;
  motivo: string;
}

const VALORES_INICIALES_AJUSTAR: DefaultValues<AjustarStockValues> = {
  cantidad: "",
  motivo: "",
};

interface AjustarStockFormProps {
  producto: Producto;
  loteId: number | null;
  onCancel: () => void;
  onSuccess: () => void;
}

function AjustarStockForm({ producto, loteId, onCancel, onSuccess }: AjustarStockFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AjustarStockValues>({
    defaultValues: VALORES_INICIALES_AJUSTAR,
  });

  const cantidad = useWatch({ control, name: "cantidad" }) ?? "";
  const cantidadNum = cantidad !== "" ? Number(cantidad) : NaN;
  const diferenciaValida = !Number.isNaN(cantidadNum);
  const diferencia = cantidadNum - producto.stockActual;

  const onSubmit = async (data: AjustarStockValues) => {
    try {
      const diff = Number(data.cantidad) - producto.stockActual;
      if (diff === 0) {
        toast.info("El stock es igual al actual");
        return;
      }

      const tipo = diff > 0 ? "ajuste_positivo" : "ajuste_negativo";

      await movimientosService.crearMovimiento({
        productoId: producto.id,
        loteId,
        tipo,
        cantidad: Math.abs(diff),
        motivo: data.motivo.trim(),
      });
      toast.success("Stock ajustado correctamente");
      onSuccess();
    } catch (error: unknown) {
      const mensaje = error instanceof Error ? error.message : String(error);
      toast.error(mensaje || "Error al ajustar stock");
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)}>
      <HeaderMini
        producto={producto}
        titulo={ACCION_LABEL["ajustar-stock"]}
        onBack={onCancel}
      />
      <div className="space-y-4">
        <div>
          <Input
            label={`Stock registrado en sistema: ${producto.stockActual}`}
            type="number"
            step="any"
            min="0"
            autoFocus
            disabled={isSubmitting}
            error={errors.cantidad?.message}
            className={noSpinnersClass}
            {...register("cantidad", {
              required: "El nuevo stock es obligatorio",
              validate: {
                numeroValido: (val) =>
                  !Number.isNaN(Number(val)) || "Debe ser un número válido",
                noNegativo: (val) => Number(val) >= 0 || "No puede ser negativo",
              },
            })}
          />
          {diferenciaValida && diferencia !== 0 && (
            <p
              className={cn(
                "mt-1.5 text-xs font-semibold",
                diferencia > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400",
              )}
            >
              Diferencia: {diferencia > 0 ? "+" : ""}{diferencia}
            </p>
          )}
        </div>
        <Input
          label="Motivo"
          type="text"
          disabled={isSubmitting}
          error={errors.motivo?.message}
          placeholder="Ej: Ajuste por conteo físico"
          {...register("motivo", {
            required: "Ingrese el motivo del ajuste",
          })}
        />
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" loading={isSubmitting}>
          Confirmar
        </Button>
      </div>
    </form>
  );
}

interface RegistrarPerdidaValues {
  cantidad: string;
  motivo: string;
  observaciones: string;
}

const VALORES_INICIALES_PERDIDA: DefaultValues<RegistrarPerdidaValues> = {
  cantidad: "",
  motivo: "",
  observaciones: "",
};

interface RegistrarPerdidaFormProps {
  producto: Producto;
  loteId: number | null;
  onCancel: () => void;
  onSuccess: () => void;
}

function RegistrarPerdidaForm({ producto, loteId, onCancel, onSuccess }: RegistrarPerdidaFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistrarPerdidaValues>({
    defaultValues: VALORES_INICIALES_PERDIDA,
  });

  const onSubmit = async (data: RegistrarPerdidaValues) => {
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
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)}>
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
      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" loading={isSubmitting}>
          Confirmar
        </Button>
      </div>
    </form>
  );
}

interface ModificarPrecioValues {
  nuevoPrecio: string;
}

interface ModificarPrecioFormProps {
  producto: Producto;
  precioInicial: number;
  onCancel: () => void;
  onSuccess: () => void;
}

function ModificarPrecioForm({ producto, precioInicial, onCancel, onSuccess }: ModificarPrecioFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ModificarPrecioValues>({
    defaultValues: { nuevoPrecio: String(precioInicial) },
  });

  const nuevoPrecio = useWatch({ control, name: "nuevoPrecio" }) ?? "";
  const nuevoPrecioNum = nuevoPrecio !== "" ? Number(nuevoPrecio) : NaN;
  const precioValido = !Number.isNaN(nuevoPrecioNum) && nuevoPrecioNum > 0;

  const onSubmit = async (data: ModificarPrecioValues) => {
    try {
      await productosService.updatePrecio(producto.id, Number(data.nuevoPrecio));
      toast.success(`Precio actualizado a ${formatearPrecio(Number(data.nuevoPrecio))}`);
      onSuccess();
    } catch (error: unknown) {
      const mensaje = error instanceof Error ? error.message : String(error);
      toast.error(mensaje || "Error al modificar precio");
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)}>
      <HeaderMini
        producto={producto}
        titulo={ACCION_LABEL["precio-venta"]}
        onBack={onCancel}
      />
      <div className="space-y-4">
        <div>
          <Input
            label="Nuevo Precio de Venta"
            type="number"
            step="0.01"
            min="0"
            autoFocus
            disabled={isSubmitting}
            error={errors.nuevoPrecio?.message}
            className={noSpinnersClass}
            {...register("nuevoPrecio", {
              required: "El precio de venta es obligatorio",
              validate: {
                numeroValido: (val) =>
                  !Number.isNaN(Number(val)) || "Debe ser un número válido",
                noNegativo: (val) => Number(val) >= 0 || "No puede ser negativo",
              },
            })}
          />
          {precioValido && (
            <p className="mt-1.5 text-xs text-slate-500">
              Mayoreo proyectado (-10%):{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {formatearPrecio(nuevoPrecioNum * 0.9)}
              </span>
            </p>
          )}
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" loading={isSubmitting}>
          Guardar
        </Button>
      </div>
    </form>
  );
}

interface EditarCodigoValues {
  nuevoCodigo: string;
}

interface EditarCodigoFormProps {
  producto: Producto;
  codigoInicial: string;
  onCancel: () => void;
  onSuccess: () => void;
}

function EditarCodigoForm({ producto, codigoInicial, onCancel, onSuccess }: EditarCodigoFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EditarCodigoValues>({
    defaultValues: { nuevoCodigo: codigoInicial },
  });

  const onSubmit = async (data: EditarCodigoValues) => {
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
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)}>
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
      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" loading={isSubmitting}>
          Guardar
        </Button>
      </div>
    </form>
  );
}

interface EditarVarianteValues {
  nuevaVariante: string;
}

interface EditarVarianteFormProps {
  producto: Producto;
  varianteInicial: string;
  onCancel: () => void;
  onSuccess: () => void;
}

function EditarVarianteForm({ producto, varianteInicial, onCancel, onSuccess }: EditarVarianteFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EditarVarianteValues>({
    defaultValues: { nuevaVariante: varianteInicial },
  });

  const onSubmit = async (data: EditarVarianteValues) => {
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
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)}>
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
      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" loading={isSubmitting}>
          Guardar
        </Button>
      </div>
    </form>
  );
}

export function ProductQuickActionsModal({
  isOpen,
  product,
  marcaNombre,
  categoriaNombre,
  onClose,
  onFullEdit,
  onOpenLotes,
  onSuccess,
}: ProductQuickActionsModalProps) {
  const [lotes, setLotes] = useState<Lote[] | null>(null);
  const [vistaActual, setVistaActual] = useState<QuickActionView>("menu");

  useEffect(() => {
    if (!isOpen || !product) return;
    let activo = true;

    void lotesService
      .getByProducto(product.id)
      .then((data) => {
        if (!activo) return;
        setLotes(data);
      })
      .catch(() => {
        if (!activo) return;
        setLotes([]);
      });

    return () => {
      activo = false;
    };
  }, [isOpen, product]);

  const loteActivo = lotes
    ? (lotes.find((lote) => lote.cantidadActual > 0) ?? lotes[0] ?? null)
    : null;
  const loteIdentidad = loteActivo
    ? (loteActivo.numeroLote ?? `Lote #${loteActivo.id}`)
    : null;

  const precioMayoreo =
    product && product.precioVenta > 0 ? product.precioVenta * 0.9 : null;

  const handleActionComplete = () => {
    setVistaActual("menu");
    if (onSuccess) onSuccess();
    else onClose();
  };

  const handleClose = () => {
    setVistaActual("menu");
    onClose();
  };

  if (!product) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth="lg"
      title="Acciones Rápidas"
    >
      <div className="flex flex-col">
        {vistaActual === "menu" && (
          <>
            <div className="mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {product.nombre}
                {product.variante && (
                  <span className="ml-1.5 font-normal text-slate-400 dark:text-slate-500">
                    · {product.variante}
                  </span>
                )}
              </h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                {marcaNombre && (
                  <>
                    <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                      {marcaNombre}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600" aria-hidden>·</span>
                  </>
                )}
                {categoriaNombre && (
                  <>
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      {categoriaNombre}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600" aria-hidden>·</span>
                  </>
                )}
                <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
                  {formatearCodigo(product.codigoInterno || product.codigosBarras)}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-100 pt-2 dark:border-slate-800">
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                  Precio{" "}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatearPrecio(product.precioVenta)}
                  </span>
                  {precioMayoreo !== null && (
                    <span className="ml-1 font-normal text-slate-400 dark:text-slate-500">
                      / {formatearPrecio(precioMayoreo)} mayoreo
                    </span>
                  )}
                </span>
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                  Stock{" "}
                  <span
                    className={cn(
                      "font-semibold",
                      product.stockActual <= 0
                        ? "text-red-600 dark:text-red-400"
                        : product.stockActual <= product.stockMinimo
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-emerald-600 dark:text-emerald-400",
                    )}
                  >
                    {product.stockActual}
                  </span>
                </span>
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                  Lote{" "}
                  {lotes === null ? (
                    <span className="font-semibold text-slate-500 dark:text-slate-400">cargando…</span>
                  ) : (
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                      {loteIdentidad ?? "Sin lote"}
                    </span>
                  )}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setVistaActual("agregar-inventario")}
                className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-2 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Agregar Inventario
              </button>
              <button
                type="button"
                onClick={() => setVistaActual("ajustar-stock")}
                className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
                Ajustar stock
              </button>
              <button
                type="button"
                onClick={() => setVistaActual("registrar-perdida")}
                className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-red-600 px-2 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-red-500"
              >
                <MinusCircle className="h-3.5 w-3.5" aria-hidden />
                Registrar pérdida
              </button>
            </div>

            <hr className="my-4 border-slate-200 dark:border-slate-800" />

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setVistaActual("precio-venta")}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition-colors hover:border-emerald-500/50 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <DollarSign className="h-4 w-4" strokeWidth={2} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">Modificar Precio de Venta</span>
                  <span className="block text-xs font-medium text-slate-400 dark:text-slate-500">Editar solo el precio unitario de venta.</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setVistaActual("editar-codigo")}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition-colors hover:border-emerald-500/50 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Barcode className="h-4 w-4" strokeWidth={2} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">Editar Código</span>
                  <span className="block text-xs font-medium text-slate-400 dark:text-slate-500">Cambiar código interno o códigos de barras.</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setVistaActual("variante-detalle")}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition-colors hover:border-emerald-500/50 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Tags className="h-4 w-4" strokeWidth={2} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">Editar Variante / Detalle</span>
                  <span className="block text-xs font-medium text-slate-400 dark:text-slate-500">Modificar la variante o detalle del producto.</span>
                </span>
              </button>
            </div>

            <hr className="my-4 border-slate-200 dark:border-slate-800" />

            <button
              type="button"
              onClick={onFullEdit}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Pencil className="h-4 w-4" aria-hidden />
              Editar toda la información del producto
            </button>

            <button
              type="button"
              onClick={onOpenLotes}
              className="mt-3 flex w-full cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-sm transition-all hover:bg-emerald-50 hover:text-emerald-800 dark:border-slate-700 dark:bg-slate-800/80 dark:text-emerald-400 dark:hover:bg-slate-700/80 dark:hover:text-emerald-300"
            >
              <span className="flex items-center gap-2">
                <Layers className="h-4 w-4" aria-hidden />
                Gestionar / Editar Lotes
              </span>
              <span className="flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors dark:text-slate-400">
                Ver vencimientos y partidas
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </span>
            </button>
          </>
        )}

        {vistaActual === "agregar-inventario" && (
          <AgregarInventarioForm
            producto={product}
            onCancel={() => setVistaActual("menu")}
            onSuccess={handleActionComplete}
          />
        )}

        {vistaActual === "ajustar-stock" && (
          <AjustarStockForm
            producto={product}
            loteId={loteActivo?.id ?? null}
            onCancel={() => setVistaActual("menu")}
            onSuccess={handleActionComplete}
          />
        )}

        {vistaActual === "registrar-perdida" && (
          <RegistrarPerdidaForm
            producto={product}
            loteId={loteActivo?.id ?? null}
            onCancel={() => setVistaActual("menu")}
            onSuccess={handleActionComplete}
          />
        )}

        {vistaActual === "precio-venta" && (
          <ModificarPrecioForm
            producto={product}
            precioInicial={product.precioVenta}
            onCancel={() => setVistaActual("menu")}
            onSuccess={handleActionComplete}
          />
        )}

        {vistaActual === "editar-codigo" && (
          <EditarCodigoForm
            producto={product}
            codigoInicial={product.codigosBarras || product.codigoInterno || ""}
            onCancel={() => setVistaActual("menu")}
            onSuccess={handleActionComplete}
          />
        )}

        {vistaActual === "variante-detalle" && (
          <EditarVarianteForm
            producto={product}
            varianteInicial={product.variante || ""}
            onCancel={() => setVistaActual("menu")}
            onSuccess={handleActionComplete}
          />
        )}
      </div>
    </Modal>
  );
}