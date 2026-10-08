import React, { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { ShieldCheck, Repeat } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { CapitalizedInput } from "../../components/ui/CapitalizedInput";
import { FieldError } from "../../components/ui/FieldError";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { cajasService } from "../../services/cajas.service";
import { noSpinnersClass } from "../inventory/quick-actions/types";
import { useCajaStore } from "../../stores/caja.store";
import { Tooltip } from "../../components/ui/Tooltip";

type AbrirCajaValues = {
  responsable: string;
  montoInicial: string;
};

const VALORES_INICIALES: AbrirCajaValues = {
  responsable: "",
  montoInicial: "",
};

const FORM_ID = "form-abrir-caja";

interface AbrirCajaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Caja simple a propósito: no hay roles ni permisos de apertura. Si alguien puede
 * abrir la caja, puede vender con ella.
 */
export function AbrirCajaModal({ isOpen, onClose }: AbrirCajaModalProps) {
  const setCaja = useCajaStore((state) => state.setCaja);

  const [responsables, setResponsables] = useState<string[]>([]);
  const [responsablesDropdown, setResponsablesDropdown] = useState(false);
  const [ultimaCaja, setUltimaCaja] = useState<
    | (import("../../../electron/db/types").CajaConResponsable & {
        montoInicial: number;
      })
    | null
  >(null);
  const responsablesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      cajasService
        .getUltimosResponsables()
        .then(setResponsables)
        .catch(console.error);
      cajasService.getUltima().then(setUltimaCaja).catch(console.error);
    }
  }, [isOpen]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AbrirCajaValues>({ defaultValues: VALORES_INICIALES });

  const valorResponsable = useWatch({ control, name: "responsable" }) ?? "";

  const responsablesSugeridos = React.useMemo(() => {
    if (!responsablesDropdown) return [];
    const termino = valorResponsable.trim().toLowerCase();
    return termino
      ? responsables.filter((r) => r.toLowerCase().includes(termino))
      : responsables;
  }, [responsables, responsablesDropdown, valorResponsable]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        responsablesRef.current &&
        !responsablesRef.current.contains(event.target as Node)
      ) {
        setResponsablesDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const registroMontoInicial = register("montoInicial", {
    required: "El monto inicial es obligatorio",
    validate: {
      numeroValido: (valor) =>
        !Number.isNaN(Number(valor)) || "Debe ser un número válido",
      noNegativo: (valor) => Number(valor) >= 0 || "No puede ser negativo",
    },
  });

  const onSubmit = async (data: AbrirCajaValues) => {
    try {
      const caja = await cajasService.open({
        responsable: data.responsable,
        montoInicial: Number(data.montoInicial),
      });
      setCaja(caja);
      toast.success(`Caja abierta · ${caja.empleadoNombre}`);
      reset(VALORES_INICIALES);
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo abrir la caja",
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Abrir caja"
      subtitle="La gaveta con la que vas a cobrar durante este turno"
      headerIcon={<ShieldCheck size={18} />}
      maxWidth="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={isSubmitting}>
            Abrir caja
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="responsable"
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Responsable
          </label>
          <div className="relative" ref={responsablesRef}>
            <div className="flex items-center gap-2">
              <CapitalizedInput
                id="responsable"
                placeholder="Ej: Juan Pérez"
                autoFocus
                disabled={isSubmitting}
                value={valorResponsable}
                aria-expanded={responsablesDropdown}
                aria-autocomplete="list"
                onFocus={() => setResponsablesDropdown(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setResponsablesDropdown(false);
                  }
                }}
                onClear={() => {
                  setValue("responsable", "", {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                  setResponsablesDropdown(false);
                }}
                {...register("responsable", {
                  required: "El nombre del responsable es obligatorio",
                  validate: {
                    noSoloEspacios: (valor) =>
                      valor.trim().length > 0 ||
                      "El nombre del responsable es obligatorio",
                  },
                })}
              />
              {ultimaCaja && (
                <Tooltip content="Repetir ultima caja">
                  <button
                    type="button"
                    className="text-lg font-medium duration-200 bg-none transition-all hover:text-emerald-400 cursor-pointer text-emerald-500 "
                    onClick={() => {
                      setValue("responsable", ultimaCaja.empleadoNombre, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                      setValue(
                        "montoInicial",
                        ultimaCaja.montoInicial.toString(),
                        {
                          shouldDirty: true,
                          shouldValidate: true,
                        },
                      );
                      setResponsablesDropdown(false);
                    }}
                    disabled={isSubmitting}
                  >
                    <Repeat size={19} />
                  </button>
                </Tooltip>
              )}
            </div>

            {responsablesDropdown && responsablesSugeridos.length > 0 && (
              <div
                role="listbox"
                className="custom-scrollbar absolute left-0 top-[calc(100%+6px)] z-[100] max-h-56 w-full animate-entry-up overflow-y-auto rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl dark:border-slate-800 dark:bg-[#0B1120]"
              >
                {responsablesSugeridos.map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="option"
                    aria-selected={r === valorResponsable}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setValue("responsable", r, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                      setResponsablesDropdown(false);
                    }}
                    className="flex w-full cursor-pointer items-center px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60"
                  >
                    <span className="truncate">{r}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <FieldError error={errors.responsable?.message} />
        </div>

        <Input
          id="montoInicial"
          label="Monto inicial en la gaveta"
          type="number"
          step="0.01"
          min="0"
          disabled={isSubmitting}
          error={errors.montoInicial?.message}
          className={noSpinnersClass}
          {...registroMontoInicial}
          onChange={(evento) => {
            const valor = evento.currentTarget.value;
            if (/^0\d/.test(valor)) {
              setValue("montoInicial", valor.replace(/^0+(?=\d)/, ""), {
                shouldDirty: true,
                shouldValidate: true,
              });
              return;
            }
            void registroMontoInicial.onChange(evento);
          }}
        />

        <div className="mt-2 flex flex-wrap gap-1.5">
          {[1000, 2000, 5000, 10000, 20000, 50000, 100000].map((monto) => (
            <Button
              key={monto}
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-lg border border-slate-200/80 bg-white/90 px-2.5 py-1 text-xs font-medium shadow-sm transition-all hover:bg-slate-50 focus-visible:ring-slate-300 dark:border-slate-700/80 dark:bg-slate-800/90 dark:hover:bg-slate-700"
              onClick={() => {
                setValue("montoInicial", monto.toString(), {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
            >
              $ {monto.toLocaleString("es-AR")}
            </Button>
          ))}
        </div>
      </form>
    </Modal>
  );
}
