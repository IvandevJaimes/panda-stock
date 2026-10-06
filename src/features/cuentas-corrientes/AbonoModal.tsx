import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { HandCoins } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { OptionGroup } from '../../components/ui/OptionGroup'
import type { ClienteConSaldo, MetodoPago } from '../../../electron/db/types'
import { cuentasCorrientesService } from '../../services/cuentas-corrientes.service'
import { useCajaStore } from '../../stores/caja.store'
import { METODOS_ABONO, formatearMoneda } from './cuentasQuery'

type FormValues = {
  monto: string
  nota: string
}

interface AbonoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  cliente: ClienteConSaldo | null
}

export function AbonoModal({ isOpen, onClose, onSuccess, cliente }: AbonoModalProps) {
  const caja = useCajaStore((estado) => estado.caja)
  const [metodoElegido, setMetodoElegido] = useState<MetodoPago>('efectivo')

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormValues>({ defaultValues: { monto: '', nota: '' } })

  const saldo = cliente?.saldo ?? 0

  /*
    Sin caja abierta el efectivo no se puede registrar, así que sale de la lista en
    vez de quedar seleccionable y reventar al confirmar. El método efectivo se
    deriva en render y no se corrige con un efecto: si la caja se cierra con el
    modal abierto, el valor cae solo al primer método disponible.
  */
  const metodosDisponibles = caja
    ? METODOS_ABONO
    : METODOS_ABONO.filter((opcion) => opcion.metodo !== 'efectivo')

  const metodo = metodosDisponibles.some((opcion) => opcion.metodo === metodoElegido)
    ? metodoElegido
    : metodosDisponibles[0]!.metodo

  /*
    El abono arranca proponiendo saldar todo, que es lo que pasa casi siempre y
    deja el botón a un clic.
  */
  useEffect(() => {
    if (!isOpen || !cliente) return

    reset({ monto: cliente.saldo > 0 ? String(cliente.saldo) : '', nota: '' })
  }, [isOpen, cliente, reset])

  const opciones = metodosDisponibles.map((opcion) => ({
    value: opcion.metodo,
    label: opcion.etiqueta,
  }))

  const onSubmit = async (data: FormValues) => {
    if (!cliente) return

    const monto = Number(data.monto)

    if (!Number.isFinite(monto) || monto <= 0) {
      toast.error('El monto del abono tiene que ser mayor a cero')
      return
    }

    // Se avisa acá y no se deja que lo rechace el backend: mostrar el error acá
    // permite corregir el número sin perder lo que ya se escribió.
    if (monto > saldo + 0.001) {
      toast.error(`El abono supera la deuda de ${formatearMoneda(saldo)}`)
      return
    }

    try {
      await cuentasCorrientesService.registrarAbono({
        clienteId: cliente.id,
        monto,
        metodo,
        cajaId: metodo === 'efectivo' ? caja?.id ?? null : null,
        nota: data.nota.trim() || null,
      })
      toast.success(`Abono de ${formatearMoneda(monto)} registrado`)
      onSuccess()
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo registrar el abono')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar abono"
      subtitle={cliente ? `${cliente.nombre} debe ${formatearMoneda(saldo)}` : undefined}
      headerIcon={<HandCoins size={18} className="text-emerald-600 dark:text-emerald-400" />}
      maxWidth="md"
      closeable={!isSubmitting}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="form-abono"
            loading={isSubmitting}
            disabled={saldo <= 0}
          >
            Registrar abono
          </Button>
        </>
      }
    >
      <form id="form-abono" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Monto"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          inputMode="decimal"
          autoFocus
          disabled={isSubmitting || saldo <= 0}
          {...register('monto')}
        />

        <OptionGroup
          label="Con qué pagó"
          options={opciones}
          value={metodo}
          onChange={setMetodoElegido}
          disabled={isSubmitting}
        />

        <Input
          label="Nota"
          placeholder="Se lo entregué a Fanny"
          disabled={isSubmitting}
          {...register('nota')}
        />

        {caja && metodo === 'efectivo' ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            El efectivo suma al arqueo de la caja #{caja.id}.
          </p>
        ) : null}
      </form>
    </Modal>
  )
}
