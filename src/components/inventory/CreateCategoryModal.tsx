import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { Modal } from "../ui/Modal";
import { FieldError } from "../ui/FieldError";
import { CapitalizedInput } from "../ui/CapitalizedInput";
import { cn } from "../../lib/cn";
import type { Categoria } from "../../../electron/db/types";
import { categoriasService } from "../../services/categorias.service";

export interface CreateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newCategory: Categoria) => void;
  categories: Categoria[];
}

interface FormValues {
  name: string;
}

export function CreateCategoryModal({
  isOpen,
  onClose,
  onSuccess,
  categories,
}: CreateCategoryModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { name: "" },
  });

  // Limpiar el formulario cuando se abre
  useEffect(() => {
    if (isOpen) reset();
  }, [isOpen, reset]);

  const onSubmit = async ({ name }: FormValues) => {
    try {
      const newCategory = await categoriasService.create(name);
      onSuccess?.(newCategory);
      onClose();
    } catch (error) {
      console.error("Error al crear categoría:", error);
      setError("name", {
        type: "server",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo crear la categoría. Intentalo de nuevo.",
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm" title="Nueva Categoría">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="categoryName"
            className="ml-1 text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Nombre de la categoría <span className="text-red-500">*</span>
          </label>
          <CapitalizedInput
            id="categoryName"
            type="text"
            autoFocus
            disabled={isSubmitting}
            placeholder="Ej. Cuidado capilar"
            {...register("name", {
              required: "El nombre de la categoría es obligatorio.",
              maxLength: {
                value: 40,
                message: "El nombre no puede tener más de 40 caracteres",
              },
              validate: (value) => {
                const nombreLimpio = value.trim();
                const esDuplicado = categories.some(
                  (cat) =>
                    cat.nombre.toLowerCase() === nombreLimpio.toLowerCase(),
                );
                return esDuplicado ? "Esta categoría ya existe" : true;
              },
            })}
            className={cn(
              "h-10 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 dark:bg-[#0B1120] dark:text-slate-100 dark:placeholder:text-slate-600",
              errors.name
                ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                : "border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700/80",
              isSubmitting && "cursor-not-allowed opacity-60",
            )}
          />
          <FieldError error={errors.name?.message} />
        </div>

        {/* Acciones del Formulario */}
        <div className="mt-2 flex items-center justify-end gap-3 border-t border-slate-100 pt-2 dark:border-slate-800/60">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50 cursor-pointer dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex min-w-[120px] items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs shadow-emerald-900/20 transition-all hover:bg-emerald-500 active:scale-95 disabled:opacity-70 disabled:active:scale-100 cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Crear categoría"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}