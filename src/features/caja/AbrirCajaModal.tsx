import { useForm } from 'react-hook-form'
import { ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { CapitalizedInput } from '../../components/ui/CapitalizedInput'
import { FieldError } from '../../components/ui/FieldError'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { cajasService } from '../../services/cajas.service'
import { noSpinnersClass } from '../inventory/quick-actions/types'
import { useCajaStore } from '../../stores/caja.store'

type AbrirCajaValues = {
  responsable: string
  montoInicial: string
}

const VALORES_INICIALES: AbrirCajaValues = {
  responsable: '',
  montoInicial: '0',
}

const FORM_ID = 'form-abrir-caja'

interface AbrirCajaModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Caja simple a propósito: no hay roles ni permisos de apertura. Si alguien puede
 * abrir la caja, puede vender con ella.
 */
export function AbrirCajaModal({ isOpen, onClose }: AbrirCajaModalProps) {
  const setCaja = useCajaStore((state) => state.setCaja)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AbrirCajaValues>({ defaultValues: VALORES_INICIALES })

  const onSubmit = async (data: AbrirCajaValues) => {
    try {
      const caja = await cajasService.open({
        responsable: data.responsable,
        montoInicial: Number(data.montoInicial),
      })
      setCaja(caja)
      toast.success(`Caja abierta · ${caja.empleadoNombre}`)
      reset(VALORES_INICIALES)
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo abrir la caja')
    }
  }

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
      <form id={FORM_ID} noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="responsable"
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Responsable
          </label>
          <CapitalizedInput
            id="responsable"
            placeholder="Ej: Juan Pérez"
            autoFocus
            disabled={isSubmitting}
            onClear={() => setValue('responsable', '')}
            {...register('responsable', {
              required: 'El nombre del responsable es obligatorio',
              validate: {
                noSoloEspacios: (valor) =>
                  valor.trim().length > 0 || 'El nombre del responsable es obligatorio',
              },
            })}
          />
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
          {...register('montoInicial', {
            required: 'El monto inicial es obligatorio',
            validate: {
              numeroValido: (valor) => !Number.isNaN(Number(valor)) || 'Debe ser un número válido',
              noNegativo: (valor) => Number(valor) >= 0 || 'No puede ser negativo',
            },
          })}
        />

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Al cerrar la caja vas a poder contar el efectivo y ver la diferencia contra este monto.
        </p>

        {/*
          Las observaciones solo importan al cerrar el turno, no al abrirlo: la
          primera lectura útil es la del arqueo. Quitar el campo acá baja ruido
          y deja el flujo más corto para el cajero.
        */}
      </form>
    </Modal>
  )
}
