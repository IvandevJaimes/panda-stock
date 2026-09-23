import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { Modal } from "../ui/Modal";
import { FieldError } from "../ui/FieldError";
import { CapitalizedInput } from "../ui/CapitalizedInput";
import { cn } from "../../lib/cn";
import { marcasService } from "../../services/marcas.service";

export interface CreateBrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  brands: { id: number; nombre: string }[];
}

interface FormValues {
  name: string;
}

export function CreateBrandModal({
  isOpen,
  onClose,
  onSuccess,
  brands,
}: CreateBrandModalProps) {
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
      await marcasService.create(name);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error al crear marca:", error);
      setError("name", {
        type: "server",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo crear la marca. Intentalo de nuevo.",
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm" title="Nueva Marca">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="brandName"
            className="ml-1 text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Nombre de la marca <span className="text-red-500">*</span>
          </label>
          <CapitalizedInput
            id="brandName"
            type="text"
            autoFocus
            disabled={isSubmitting}
            placeholder="Ej. Pantene"
            {...register("name", {
              required: "El nombre de la marca es obligatorio.",
              maxLength: {
                value: 40,
                message: "El nombre no puede tener más de 40 caracteres",
              },
              validate: (value) => {
                const nombreLimpio = value.trim();
                const esDuplicado = brands.some(
                  (brand) =>
                    brand.nombre.toLowerCase() === nombreLimpio.toLowerCase(),
                );
                return esDuplicado ? "Esta marca ya existe" : true;
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
            className="cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex min-w-[120px] cursor-pointer items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs shadow-emerald-900/20 transition-all hover:bg-emerald-500 active:scale-95 disabled:opacity-70 disabled:active:scale-100"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Crear marca"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}