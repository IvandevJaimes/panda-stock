import * as React from "react";
import { useEffect, useMemo } from "react";
import { Sparkles, X } from "lucide-react";
import {
  Controller,
  useForm,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";
import { FieldError } from "../../../components/ui/FieldError";
import { CapitalizedInput } from "../../../components/ui/CapitalizedInput";
import { MargenGananciaHint } from "../../../components/ui/MargenGananciaHint";
import { CreateCategoryModal } from "../../../components/inventory/CreateCategoryModal";
import { Tooltip } from "../../../components/ui/Tooltip";
import {
  CustomSelect,
  type SelectOption,
} from "../../../components/ui/CustomSelect";
import { cn } from "../../../lib/cn";
import { productosService } from "../../../services/productos.service";
import { marcasService } from "../../../services/marcas.service";
import type {
  Categoria,
  Marca,
  Producto,
} from "../../../../electron/db/types";
import { HeaderMini } from "./HeaderMini";
import { ACCION_LABEL, FORM_ID } from "./types";

interface EditarProductoFormProps {
  producto: Producto;
  categorias: Categoria[];
  onCancel: () => void;
  onSuccess: () => void;
  onSubmittingChange: (submitting: boolean) => void;
  onCanSaveChange?: (canSave: boolean) => void;
  onCategoriaCreada?: (categoria: Categoria) => void;
}

interface FormValues {
  nombre: string;
  variante: string;
  codigo: string;
  categoriaId: number;
  marca: string;
  precioVenta: string;
  stockMinimo: string;
}

const SUGERENCIAS_LIMITE = 8;

export function EditarProductoForm({
  producto,
  categorias,
  onCancel,
  onSuccess,
  onSubmittingChange,
  onCanSaveChange,
  onCategoriaCreada,
}: EditarProductoFormProps) {
  const [marcas, setMarcas] = React.useState<Marca[]>([]);
  const [marcaNombreActual, setMarcaNombreActual] = React.useState("");
  const [marcasDropdown, setMarcasDropdown] = React.useState(false);
  const marcasRef = React.useRef<HTMLDivElement>(null);
  const [creandoCategoria, setCreandoCategoria] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      nombre: producto.nombre,
      variante: producto.variante ?? "",
      codigo: producto.codigoInterno ?? "",
      categoriaId: producto.categoriaId ?? 0,
      marca: "",
      precioVenta: String(producto.precioVenta),
      stockMinimo: String(producto.stockMinimo),
    },
  });

  const valorMarca = useWatch({ control, name: "marca" }) ?? "";

  // Carga las marcas al montar y resuelve el nombre de la marca actual del
  // producto (el backend las devuelve ordenadas por id descendente).
  React.useEffect(() => {
    let activo = true;
    void marcasService
      .getAll()
      .then((data) => {
        if (!activo) return;
        setMarcas(data);
        const marcaActual = data.find((m) => m.id === producto.marcaId);
        if (marcaActual) {
          setMarcaNombreActual(marcaActual.nombre);
          setValue("marca", marcaActual.nombre, { shouldDirty: false });
        }
      })
      .catch(() => {
        // El autocomplete es una ayuda: si falla, el texto libre alcanza
      });
    return () => {
      activo = false;
    };
  }, [producto.marcaId, setValue]);

  const marcasSugeridas = React.useMemo(() => {
    if (!marcasDropdown) return [];
    const termino = valorMarca.trim().toLowerCase();
    const coincidencias = termino
      ? marcas.filter((m) => m.nombre.toLowerCase().includes(termino))
      : marcas;
    return coincidencias.slice(0, SUGERENCIAS_LIMITE);
  }, [marcas, marcasDropdown, valorMarca]);

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

  const val = useWatch({ control });

  const generarCodigoSugerido = () => {
    const codigoSugerido = String(Math.floor(1000 + Math.random() * 9000));
    setValue("codigo", codigoSugerido, {
      shouldDirty: true,
      shouldValidate: true,
    });
    toast.info(`Código sugerido: ${codigoSugerido}`);
  };

  const hayCodigo = Boolean(val.codigo?.trim());

  const hayCambios = useMemo(() => {
    const nombre = val.nombre?.trim() ?? "";
    const variante = val.variante?.trim() || null;
    const categoriaId =
      Number(val.categoriaId) > 0 ? Number(val.categoriaId) : null;
    const marca = val.marca?.trim() || null;
    const precioVenta = Number(val.precioVenta) || 0;
    const stockMinimo =
      Math.max(0, Math.round(Number(val.stockMinimo) || 0));
    const codigoLimpio = val.codigo?.trim() ?? "";

    let codigoInterno: string | null = null;
    let codigosBarras: string | null = null;
    if (codigoLimpio) {
      const esBarra =
        /^[0-9, ]+$/.test(codigoLimpio) && codigoLimpio.length >= 8;
      if (esBarra) {
        codigosBarras = codigoLimpio;
      } else {
        codigoInterno = codigoLimpio;
      }
    }

    return (
      nombre !== (producto.nombre ?? "") ||
      variante !== (producto.variante ?? null) ||
      categoriaId !== (producto.categoriaId ?? null) ||
      marca !== (marcaNombreActual || null) ||
      precioVenta !== producto.precioVenta ||
      stockMinimo !== producto.stockMinimo ||
      (codigoInterno ?? producto.codigoInterno) !==
        producto.codigoInterno ||
      (codigosBarras ?? producto.codigosBarras) !==
        producto.codigosBarras
    );
  }, [val, producto, marcaNombreActual]);

  useEffect(() => {
    onCanSaveChange?.(hayCambios);
  }, [hayCambios, onCanSaveChange]);

  const opcionesCategorias: SelectOption[] = categorias.map((cat) => ({
    value: cat.id,
    label: cat.nombre,
  }));

  const onSubmit = async (data: FormValues) => {
    onSubmittingChange(true);
    try {
      const payload: Record<string, unknown> = {
        nombre: data.nombre.trim(),
        variante: data.variante.trim() || null,
        categoriaId:
          Number(data.categoriaId) > 0 ? Number(data.categoriaId) : null,
        marca: data.marca.trim() || null,
        precioVenta: Number(data.precioVenta),
        stockMinimo: Math.max(0, Math.round(Number(data.stockMinimo) || 0)),
      };

      const codigoLimpio = data.codigo.trim();
      if (codigoLimpio) {
        const esBarra =
          /^[0-9, ]+$/.test(codigoLimpio) && codigoLimpio.length >= 8;
        if (esBarra) {
          payload.codigosBarras = codigoLimpio;
        } else {
          payload.codigoInterno = codigoLimpio;
        }
      }

      await productosService.update(producto.id, payload);

      toast.success("Producto actualizado exitosamente");
      onSuccess();
    } catch (error: unknown) {
      const mensaje =
        error instanceof Error
          ? error.message
          : "Error al actualizar el producto";

      if (
        mensaje.toLowerCase().includes("unique") &&
        mensaje.toLowerCase().includes("codigo_interno")
      ) {
        setError("codigo", {
          type: "manual",
          message: "Este código ya está en uso",
        });
        toast.error("El código ya existe en otro producto");
      } else {
        toast.error(mensaje);
      }
    } finally {
      onSubmittingChange(false);
    }
  };

  return (
    <>
      <form
        id={FORM_ID["editar-producto"]}
        noValidate
        onSubmit={handleSubmit(onSubmit)}
      >
      <HeaderMini
        producto={producto}
        titulo={ACCION_LABEL["editar-producto"]}
        onBack={onCancel}
      />
      <div className="flex flex-col gap-4">
        {/* Fila 1: Nombre y Marca */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-nombre"
              className="ml-1 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Nombre del producto <span className="text-red-500">*</span>
            </label>
            <CapitalizedInput
              id="edit-nombre"
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
              htmlFor="edit-marca"
              className="ml-1 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Marca
            </label>
            <div ref={marcasRef} className="relative">
              <CapitalizedInput
                id="edit-marca"
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

        {/* Fila 2: Variante / Detalle y Categoría */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-variante"
              className="ml-1 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Variante / Detalle
            </label>
            <CapitalizedInput
              id="edit-variante"
              type="text"
              disabled={isSubmitting}
              placeholder="Ej. 500ml / Rojo"
              value={val.variante ?? ""}
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

        {/* Fila 3: Código */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between ml-1">
            <label
              htmlFor="edit-codigo"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Código (interno o de barra)
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
          <div className="relative w-full">
            <input
              id="edit-codigo"
              type="text"
              disabled={isSubmitting}
              placeholder="Ej. 111 o 7790012345678"
              {...register("codigo", {
                maxLength: {
                  value: 30,
                  message: "Máximo 30 caracteres",
                },
              })}
              className={cn(
                "h-10 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 dark:bg-[#0B1120] dark:text-slate-100 dark:placeholder:text-slate-600",
                hayCodigo && "pr-9",
                errors.codigo
                  ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                  : "border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700/80",
              )}
            />
            {hayCodigo && (
              <button
                type="button"
                onClick={() =>
                  setValue("codigo", "", {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                aria-label="Limpiar campo"
                className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </div>
          <FieldError error={errors.codigo?.message} />
        </div>

        {/* Fila 5: Precio de Venta y Stock Mínimo */}
        <div className="grid grid-cols-2 gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-precioVenta"
              className="ml-1 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Precio de venta ($) <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-precioVenta"
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
              costo={producto.costo}
              precio={Number(val.precioVenta) || 0}
            />
            <FieldError error={errors.precioVenta?.message} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-stockMinimo"
              className="ml-1 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Stock mínimo
            </label>
            <input
              id="edit-stockMinimo"
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
                "h-10 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 dark:bg-[#0B1120] dark:text-slate-100 dark:placeholder:text-slate-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                errors.stockMinimo
                  ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                  : "border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700/80",
              )}
            />
            <FieldError error={errors.stockMinimo?.message} />
          </div>
        </div>
      </div>
      </form>

      <CreateCategoryModal
        isOpen={creandoCategoria}
        onClose={() => setCreandoCategoria(false)}
        categories={categorias}
        onSuccess={(nueva) => {
          onCategoriaCreada?.(nueva);
          setValue("categoriaId", nueva.id, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }}
      />
    </>
  );
}