import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Input } from "../../../components/ui/Input";
import { Tooltip } from "../../../components/ui/Tooltip";
import { productosService } from "../../../services/productos.service";
import type { Producto } from "../../../../electron/db/types";
import { HeaderMini } from "./HeaderMini";
import { ACCION_LABEL, FORM_ID } from "./types";
import { useBarcodeScanner } from "../../../hooks/useBarcodeScanner";
import { useCodigosBarrasUnicos } from "../../../hooks/useCodigosBarrasUnicos";
import {
  dismissCodigoEnUso,
  toastCodigoEnUso,
} from "../../../lib/codigosBarras";

interface EditarCodigoValues {
  codigoInterno: string;
  codigosBarras: string;
}

interface EditarCodigoFormProps {
  producto: Producto;
  onCancel: () => void;
  onSuccess: () => void;
  onSubmittingChange: (submitting: boolean) => void;
  onCanSaveChange?: (canSave: boolean) => void;
}

export function EditarCodigoForm({
  producto,
  onCancel,
  onSuccess,
  onSubmittingChange,
  onCanSaveChange,
}: EditarCodigoFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EditarCodigoValues>({
    defaultValues: {
      codigoInterno: producto.codigoInterno ?? "",
      codigosBarras: producto.codigosBarras ?? "",
    },
  });

  // Verificación en caliente: el producto en edición queda exento de su propio
  // código; cualquier otro código ya asociado a otro producto avisa con un toast
  // (se oculta al corregir el campo). Si el código está en uso, no queda escrito.
  useCodigosBarrasUnicos(
    control,
    (mensaje) => toastCodigoEnUso(mensaje),
    () => dismissCodigoEnUso(),
    {
      excluirProductoId: producto?.id ?? null,
      setValorCampo: (valor) => setValue("codigosBarras", valor),
    },
  );

  // Scanner: al escanear un código, se escribe en "Códigos de barra" sin depender
  // del campo que tenga foco. Agrega el código separado por coma si no existe.
  useBarcodeScanner("edit-code-form", (barcode) => {
    const actual = getValues("codigosBarras") ?? "";
    const codigos = actual
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    if (!codigos.includes(barcode)) {
      codigos.push(barcode);
    }
    setValue("codigosBarras", codigos.join(", "), { shouldValidate: true });
  });

  const codigoInterno =
    useWatch({ control, name: "codigoInterno" }) ?? "";
  const codigosBarras =
    useWatch({ control, name: "codigosBarras" }) ?? "";

  const huboCambios =
    codigoInterno.trim().toUpperCase() !==
      (producto.codigoInterno ?? "").trim().toUpperCase() ||
    codigosBarras.trim() !==
      (producto.codigosBarras ?? "").trim();

  useEffect(() => {
    onCanSaveChange?.(huboCambios);
  }, [huboCambios, onCanSaveChange]);

  const generarCodigoSugerido = () => {
    const codigoSugerido = String(Math.floor(1000 + Math.random() * 9000));
    setValue("codigoInterno", codigoSugerido, { shouldValidate: true });
    toast.info(`Código sugerido: ${codigoSugerido}`);
  };

  const onSubmit = async (data: EditarCodigoValues) => {
    onSubmittingChange(true);
    try {
      await productosService.update(producto.id, {
        codigoInterno: data.codigoInterno.trim().toUpperCase(),
        codigosBarras: data.codigosBarras,
      });
      toast.success("Código actualizado correctamente");
      onSuccess();
    } catch (error: unknown) {
      const mensaje = error instanceof Error ? error.message : String(error);
      if (mensaje.toLowerCase().includes("de barras")) {
        toastCodigoEnUso(mensaje);
      } else {
        toast.error(mensaje || "Error al actualizar código");
      }
    } finally {
      onSubmittingChange(false);
    }
  };

  return (
    <form
      id={FORM_ID["editar-codigo"]}
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <HeaderMini
        producto={producto}
        titulo={ACCION_LABEL["editar-codigo"]}
        onBack={onCancel}
      />
      <div className="space-y-4">
        <Input
          label="Código interno"
          type="text"
          autoFocus
          disabled={isSubmitting}
          error={errors.codigoInterno?.message}
          value={codigoInterno}
          className="font-mono uppercase"
          labelAction={
            <Tooltip content="Generar código sugerido">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={generarCodigoSugerido}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="h-3 w-3" />
                <span>Autogenerar</span>
              </button>
            </Tooltip>
          }
          onClear={() =>
            setValue("codigoInterno", "", { shouldValidate: true })
          }
          {...register("codigoInterno", {
            maxLength: {
              value: 20,
              message: "Máximo 20 caracteres",
            },
          })}
        />
        <Input
          label="Códigos de barra"
          type="text"
          disabled={isSubmitting}
          placeholder="Ej. 779001, 779002"
          error={errors.codigosBarras?.message}
          value={codigosBarras}
          onClear={() =>
            setValue("codigosBarras", "", { shouldValidate: true })
          }
          {...register("codigosBarras", {
            maxLength: {
              value: 100,
              message: "Máximo 100 caracteres",
            },
          })}
        />
      </div>
    </form>
  );
}