import * as React from "react";
import { Loader2, Sparkles } from "lucide-react";
import {
  Controller,
  useForm,
  useWatch,
  type DefaultValues,
} from "react-hook-form";
import { toast } from "sonner";
import { Modal } from "../../components/ui/Modal";
import { FieldError } from "../../components/ui/FieldError";
import { CapitalizedInput } from "../../components/ui/CapitalizedInput";
import { ProductImageField } from "../../components/ui/ProductImageField";
import { CreateCategoryModal } from "../../components/inventory/CreateCategoryModal";
import {
  CustomSelect,
  type SelectOption,
} from "../../components/ui/CustomSelect";
import { DateInput } from "../../components/ui/DateInput";
import { MargenGananciaHint } from "../../components/ui/MargenGananciaHint";
import { cn } from "../../lib/cn";
import { productosService } from "../../services/productos.service";
import { marcasService } from "../../services/marcas.service";
import type {
  Categoria,
  Marca,
  Producto,
  UnidadMedida,
} from "../../../electron/db/types";
import { Tooltip } from "../../components/ui/Tooltip";

export interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (nuevoProducto?: Producto) => void;
  categorias: Categoria[];
  onCategoriaCreada?: (categoria: Categoria) => void;
}

export interface FormValues {
  nombre: string;
  variante?: string;
  codigoInterno: string;
  codigosBarras: string;
  categoriaId: number;
  marca: string;
  unidadMedida: UnidadMedida;
  costo: string;
  precioVenta: string;
  stockActual: string;
  stockMinimo: string;
  vencimiento?: string;
  /** Foto pendiente de subir: se persiste tras crear el producto. */
  imagen: File | null;
}

const SUGERENCIAS_LIMITE = 8;

const VALORES_INICIALES: DefaultValues<FormValues> = {
  nombre: "",
  variante: "",
  codigoInterno: "",
  codigosBarras: "",
  categoriaId: 0,
  marca: "",
  unidadMedida: "unidad",
  costo: "",
  precioVenta: "",
  stockActual: "",
  stockMinimo: "",
  vencimiento: "",
  imagen: null,
};

export function CreateProductModal({
  isOpen,
  onClose,
  onSuccess,
  categorias,
  onCategoriaCreada,
}: CreateProductModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: VALORES_INICIALES,
  });

  const [creandoCategoria, setCreandoCategoria] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) reset(VALORES_INICIALES);
  }, [isOpen, reset]);

  const [marcas, setMarcas] = React.useState<Marca[]>([]);
  const [marcasDropdown, setMarcasDropdown] = React.useState(false);
  const marcasRef = React.useRef<HTMLDivElement>(null);
  const valorMarca = useWatch({ control, name: "marca" }) ?? "";
  const valorVariante = useWatch({ control, name: "variante" }) ?? "";
  const valorCosto = useWatch({ control, name: "costo" }) ?? "";
  const valorPrecioVenta = useWatch({ control, name: "precioVenta" }) ?? "";

  const marcasSugeridas = React.useMemo(() => {
    if (!marcasDropdown) return [];
    const termino = valorMarca.trim().toLowerCase();
    const coincidencias = termino
      ? marcas.filter((m) => m.nombre.toLowerCase().includes(termino))
      : marcas;
    return coincidencias.slice(0, SUGERENCIAS_LIMITE);
  }, [marcas, marcasDropdown, valorMarca]);

  const obtenerMarcas = React.useCallback((): Promise<Marca[]> => {
    return marcasService.getAll();
  }, []);

  // Carga las marcas cada vez que se abre el modal (el backend ya las devuelve
  // ordenadas por id descendente: las más recientes primero). Los setState viven
  // en callbacks asíncronos (.then), respetando react-hooks/set-state-in-effect.
  React.useEffect(() => {
    if (!isOpen) return;
    let activo = true;
    void obtenerMarcas()
      .then((data) => {
        if (!activo) return;
        setMarcas(data);
        setMarcasDropdown(false);
      })
      .catch(() => {
        // El autocomplete es una ayuda: si falla, el alta sigue con texto libre
      });
    return () => {
      activo = false;
    };
  }, [isOpen, obtenerMarcas]);

  // Cerrar el dropdown al hacer clic fuera del contenedor de marca. El setState
  // vive dentro del callback del listener (asíncrono), no viola set-state-in-effect.
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        marcasRef.current &&
        !marcasRef.current.contains(event.target as Node)
      ) {
        setMarcasDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const generarCodigoSugerido = () => {
    const codigoSugerido = String(Math.floor(1000 + Math.random() * 9000));
    setValue("codigoInterno", codigoSugerido, { shouldValidate: true });
    toast.info(`Código sugerido: ${codigoSugerido}`);
  };

  const opcionesCategorias: SelectOption[] = categorias.map((cat) => ({
    value: cat.id,
    label: cat.nombre,
  }));

  const crearProducto = async (data: FormValues) => {
    // Normalización defensiva: garantiza ISO YYYY-MM-DD o null.
    // Acepta DD/MM/YYYY y DD/MM/YY (año de 2 dígitos expandido a 20XX)
    let vencimientoNormalizado: string | null = null;
    if (data.vencimiento) {
      const esIso = /^\d{4}-\d{2}-\d{2}$/.test(data.vencimiento);
      if (esIso) {
        vencimientoNormalizado = data.vencimiento;
      } else {
        const [dia, mes, anio] = data.vencimiento.split("/");
        if (dia && mes && anio && anio.length >= 2 && anio.length <= 4) {
          const anioCompleto = anio.length === 2 ? `20${anio}` : anio;
          vencimientoNormalizado = `${anioCompleto}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
        }
      }
    }

    const payload = {
      ...data,
      nombre: data.nombre.trim(),
      variante: data.variante?.trim() || null,
      codigoInterno: data.codigoInterno.trim(),
      codigosBarras:
        data.codigosBarras.trim() || null,
      vencimiento: vencimientoNormalizado,
      categoriaId:
        Number(data.categoriaId) > 0 ? Number(data.categoriaId) : null,
      marca: data.marca.trim() || null,
      imagen: undefined,
    };

    const nuevoProducto = await productosService.create(payload);

    // La foto se persiste recién tras tener el producto creado (necesita su id).
    if (data.imagen) {
      try {
        await productosService.setImage(nuevoProducto.id, data.imagen);
      } catch (error) {
        toast.warning(
          "Producto creado, pero no se pudo guardar la foto: " +
            (error instanceof Error ? error.message : "error desconocido"),
        );
      }
    }

    return nuevoProducto;
  };

  const manejarErrorCreacion = (error: unknown) => {
    console.error("Error al crear producto:", error);
    const mensaje =
      error instanceof Error ? error.message : "Error al crear el producto";

    if (
      mensaje.toLowerCase().includes("unique") &&
      mensaje.toLowerCase().includes("codigo_interno")
    ) {
      setError("codigoInterno", {
        type: "manual",
        message: "Este código ya está en uso",
      });
      toast.error("El código ya existe en otro producto");
    } else {
      toast.error(mensaje);
    }
  };

  const onSubmit = async (data: FormValues) => {
    try {
      const nuevoProducto = await crearProducto(data);

      toast.success("Producto creado exitosamente");
      onSuccess?.(nuevoProducto);
      onClose();
    } catch (error: unknown) {
      manejarErrorCreacion(error);
    }
  };

  const onSubmitGuardarOtro = async (data: FormValues) => {
    try {
      const nuevoProducto = await crearProducto(data);

      toast.success("Producto creado exitosamente");
      onSuccess?.(nuevoProducto);
      reset(VALORES_INICIALES);
      void obtenerMarcas()
        .then((data) => {
          setMarcas(data);
          setMarcasDropdown(false);
        })
        .catch(() => {
          // El autocomplete es una ayuda: si falla, el alta sigue con texto libre
        });
    } catch (error: unknown) {
      manejarErrorCreacion(error);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      maxWidth="2xl"
      onClose={onClose}
      title="Nuevo Producto"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Filas 1 y 2 con el campo de foto a la izquierda */}
        <div className="flex items-center gap-4">
          <Controller
            name="imagen"
            control={control}
            render={({ field }) => (
              <ProductImageField
                value={field.value}
                onChange={field.onChange}
                className="h-28 w-28 shrink-0 sm:h-32 sm:w-32"
              />
            )}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-4">
        {/* Fila 1 (dos columnas): Nombre y Marca */}
        <div className="grid grid-cols-2 gap-4">
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

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="marca"
              className="ml-1 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Marca
            </label>
            <div ref={marcasRef} className="relative">
              <CapitalizedInput
                id="marca"
                type="text"
                disabled={isSubmitting}
                placeholder="Ej. Dove, Nivea, L'Oréal"
                value={valorMarca}
                aria-expanded={marcasDropdown}
                aria-autocomplete="list"
                onFocus={() => setMarcasDropdown(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setMarcasDropdown(false);
                  }
                }}
                onClear={() => {
                  setValue("marca", "", { shouldValidate: true });
                  setMarcasDropdown(false);
                }}
                {...register("marca", {
                  maxLength: {
                    value: 40,
                    message: "Máximo 40 caracteres",
                  },
                })}
                className={cn(
                  "h-10 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 dark:bg-[#0B1120] dark:text-slate-100 dark:placeholder:text-slate-600",
                  errors.marca
                    ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                    : "border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700/80",
                )}
              />
              {marcasDropdown && marcasSugeridas.length > 0 && (
                <div
                  role="listbox"
                  className="custom-scrollbar absolute left-0 top-[calc(100%+6px)] z-[100] max-h-56 w-full animate-entry-up overflow-y-auto rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl dark:border-slate-800 dark:bg-[#0B1120]"
                >
                  {marcasSugeridas.map((marca) => (
                    <button
                      key={marca.id}
                      type="button"
                      role="option"
                      aria-selected={marca.nombre === valorMarca}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setValue("marca", marca.nombre, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                        setMarcasDropdown(false);
                      }}
                      className="flex w-full cursor-pointer items-center px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60"
                    >
                      <span className="truncate">{marca.nombre}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <FieldError error={errors.marca?.message} />
          </div>
        </div>

        {/* Fila 2 (dos columnas): Variante / Detalle y Categoría */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="variante"
              className="ml-1 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Variante / Detalle
            </label>
            <CapitalizedInput
              id="variante"
              type="text"
              disabled={isSubmitting}
              placeholder="Ej. 500ml / Rojo"
              value={valorVariante}
              onClear={() =>
                setValue("variante", "", { shouldValidate: true })
              }
              {...register("variante", {
                maxLength: {
                  value: 40,
                  message: "Máximo 40 caracteres",
                },
              })}
              className={cn(
                "h-10 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 dark:bg-[#0B1120] dark:text-slate-100 dark:placeholder:text-slate-600",
                errors.variante
                  ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                  : "border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700/80",
              )}
            />
            <FieldError error={errors.variante?.message} />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="ml-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
              Categoría <span className="text-red-500">*</span>
            </span>
            <Controller
              name="categoriaId"
              control={control}
              rules={{
                required: "Selecciona una categoría",
                min: { value: 1, message: "Categoría inválida" },
              }}
              render={({ field }) => (
                <CustomSelect
                  options={opcionesCategorias}
                  value={field.value}
                  onChange={(valor) => field.onChange(Number(valor))}
                  placeholder="Seleccionar categoría..."
                  disabled={isSubmitting}
                  error={!!errors.categoriaId}
                  footerLabel="Nueva categoría"
                  onFooterClick={() => setCreandoCategoria(true)}
                />
              )}
            />
            <FieldError error={errors.categoriaId?.message} />
          </div>
        </div>
          </div>
        </div>

        {/* Fila 3 (dos columnas): Código interno y Códigos de barra */}
        <div className="grid grid-cols-2 gap-3.5">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between ml-1">
              <label
                htmlFor="codigoInterno"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Código interno
              </label>
              <Tooltip content="Generar código sugerido">
                <button
                  type="button"
                  onClick={generarCodigoSugerido}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Autogenerar</span>
                </button>
              </Tooltip>
            </div>
            <input
              id="codigoInterno"
              type="text"
              disabled={isSubmitting}
              placeholder="Ej. 111"
              {...register("codigoInterno", {
                maxLength: {
                  value: 20,
                  message: "Máximo 20 caracteres",
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
              Códigos de barra
            </label>
            <input
              id="codigosBarras"
              type="text"
              disabled={isSubmitting}
              placeholder="Ej. 779001, 779002"
              {...register("codigosBarras", {
                maxLength: {
                  value: 100,
                  message: "Máximo 100 caracteres",
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

        {/* Fila 5 (dos columnas): Precios (Costo y Venta) */}
        <div className="grid grid-cols-2 gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="costo"
              className="ml-1 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Costo unitario ($) <span className="text-red-500">*</span>
            </label>
            <input
              id="costo"
              type="number"
              step="0.01"
              disabled={isSubmitting}
              onWheel={(e) => e.currentTarget.blur()}
              {...register("costo", {
                required: "El costo es obligatorio",
                validate: {
                  numeroValido: (val) =>
                    !Number.isNaN(Number(val)) ||
                    "Debe ser un número válido",
                  mayorQueCero: (val) =>
                    Number(val) > 0 || "Debe ser mayor a 0",
                },
              })}
              className={cn(
                "h-10 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none transition-all dark:bg-[#0B1120] dark:text-slate-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
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
              onWheel={(e) => e.currentTarget.blur()}
              {...register("precioVenta", {
                required: "El precio de venta es obligatorio",
                validate: {
                  numeroValido: (val) =>
                    !Number.isNaN(Number(val)) ||
                    "Debe ser un número válido",
                  mayorQueCero: (val) =>
                    Number(val) > 0 || "Debe ser mayor a 0",
                },
              })}
              className={cn(
                "h-10 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none transition-all dark:bg-[#0B1120] dark:text-slate-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                errors.precioVenta
                  ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                  : "border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700/80",
              )}
            />
            <MargenGananciaHint
              costo={Number(valorCosto) || 0}
              precio={Number(valorPrecioVenta) || 0}
            />
            <FieldError error={errors.precioVenta?.message} />
          </div>
        </div>

        {/* Fila 6 (tres columnas): Stock Inicial, Stock Mínimo y Vencimiento */}
        <div className="grid grid-cols-3 gap-3.5">
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
              onWheel={(e) => e.currentTarget.blur()}
              {...register("stockActual", {
                required: "El stock inicial es obligatorio",
                validate: {
                  numeroValido: (val) =>
                    !Number.isNaN(Number(val)) ||
                    "Debe ser un número válido",
                  noNegativo: (val) =>
                    Number(val) >= 0 || "No puede ser negativo",
                },
              })}
              className={cn(
                "h-10 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none transition-all dark:bg-[#0B1120] dark:text-slate-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
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
              onWheel={(e) => e.currentTarget.blur()}
              {...register("stockMinimo", {
                validate: {
                  numeroValido: (val) =>
                    val.trim() === "" ||
                    !Number.isNaN(Number(val)) ||
                    "Debe ser un número válido",
                  noNegativo: (val) =>
                    val.trim() === "" ||
                    Number(val) >= 0 ||
                    "No puede ser negativo",
                },
              })}
              className={cn(
                "h-10 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none transition-all dark:bg-[#0B1120] dark:text-slate-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
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
            <Controller
              name="vencimiento"
              control={control}
              render={({ field, fieldState }) => (
                <DateInput
                  id="vencimiento"
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  error={!!fieldState.error}
                  disabled={isSubmitting}
                  placement="top-end"
                />
              )}
            />
            <FieldError error={errors.vencimiento?.message} />
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
            type="button"
            onClick={() => void handleSubmit(onSubmitGuardarOtro)()}
            disabled={isSubmitting}
            className="flex min-w-[140px] cursor-pointer items-center justify-center rounded-xl border border-emerald-600/40 bg-emerald-500/5 px-4 py-2 text-sm font-semibold text-emerald-700 transition-all hover:bg-emerald-500/10 active:scale-95 disabled:opacity-70 disabled:active:scale-100 dark:text-emerald-400"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Guardar y crear otro"
            )}
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

      <CreateCategoryModal
        isOpen={creandoCategoria}
        onClose={() => setCreandoCategoria(false)}
        categories={categorias}
        onSuccess={(nueva) => {
          onCategoriaCreada?.(nueva);
          setValue("categoriaId", nueva.id, { shouldValidate: true });
        }}
      />
    </Modal>
  );
}