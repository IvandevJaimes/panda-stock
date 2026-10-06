import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { NotebookPen } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import type { ClienteConSaldo } from '../../../electron/db/types'
import { cuentasCorrientesService } from '../../services/cuentas-corrientes.service'
import { formatearMoneda } from './cuentasQuery'

type FormValues = {
  monto: string
  nota: string
}

interface CargoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  cliente: ClienteConSaldo | null
}

/** Deuda que no viene de una venta del mostrador: un pedido, mercadería prestada. */
export function CargoModal({ isOpen, onClose, onSuccess, cliente }: CargoModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormValues>({ defaultValues: { monto: '', nota: '' } })

  useEffect(() => {
    if (!isOpen) return
    reset({ monto: '', nota: '' })
  }, [isOpen, reset])

  const onSubmit = async (data: FormValues) => {
    if (!cliente) return

    const monto = Number(data.monto)

    if (!Number.isFinite(monto) || monto <= 0) {
      toast.error('El monto de la deuda tiene que ser mayor a cero')
      return
    }

    try {
      await cuentasCorrientesService.registrarCargo({
        clienteId: cliente.id,
        monto,
        nota: data.nota.trim() || null,
      })
      toast.success(`Deuda de ${formatearMoneda(monto)} cargada`)
      onSuccess()
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cargar la deuda')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cargar deuda"
      subtitle={cliente ? cliente.nombre : undefined}
      headerIcon={<NotebookPen size={18} className="text-amber-600 dark:text-amber-400" />}
      maxWidth="md"
      closeable={!isSubmitting}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form="form-cargo" loading={isSubmitting}>
            Cargar deuda
          </Button>
        </>
      }
    >
      <form id="form-cargo" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Monto"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          inputMode="decimal"
          autoFocus
          disabled={isSubmitting}
          {...register('monto')}
        />

        <Input
          label="Motivo"
          placeholder="Le presté mercadería"
          disabled={isSubmitting}
          {...register('nota')}
        />
      </form>
    </Modal>
  )
}
