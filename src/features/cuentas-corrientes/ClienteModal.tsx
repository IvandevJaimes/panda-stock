import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { User } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import type { Cliente, ClienteInput } from '../../../electron/db/types'
import { cuentasCorrientesService } from '../../services/cuentas-corrientes.service'

type FormValues = {
  nombre: string
  telefono: string
  notas: string
}

const VALORES_INICIALES: FormValues = { nombre: '', telefono: '', notas: '' }

interface ClienteModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  /** Si viene, el modal edita; si no, da de alta. */
  cliente?: Cliente | null
}

export function ClienteModal({
  isOpen,
  onClose,
  onSuccess,
  cliente,
}: ClienteModalProps) {
  const editando = Boolean(cliente)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: VALORES_INICIALES })

  // El modal se reutiliza para alta y para edición: sin esto, abrir "Editar" sobre
  // un cliente y después "Nuevo" dejaría los datos del anterior en los campos.
  useEffect(() => {
    if (!isOpen) return

    reset(
      cliente
        ? {
            nombre: cliente.nombre,
            telefono: cliente.telefono ?? '',
            notas: cliente.notas ?? '',
          }
        : VALORES_INICIALES,
    )
  }, [isOpen, cliente, reset])

  const onSubmit = async (data: FormValues) => {
    const nombre = data.nombre.trim()

    if (nombre.length < 2) {
      toast.error('El nombre del cliente es obligatorio')
      return
    }

    const payload: ClienteInput = {
      nombre,
      telefono: data.telefono.trim() || null,
      notas: data.notas.trim() || null,
    }

    try {
      if (cliente) {
        await cuentasCorrientesService.actualizarCliente(cliente.id, payload)
        toast.success('Cliente actualizado')
      } else {
        await cuentasCorrientesService.crearCliente(payload)
        toast.success('Cliente creado')
      }
      onSuccess()
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el cliente')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editando ? 'Editar cliente' : 'Nuevo cliente'}
      headerIcon={<User size={18} className="text-emerald-600 dark:text-emerald-400" />}
      maxWidth="md"
      closeable={!isSubmitting}
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" form="form-cliente" loading={isSubmitting}>
            {editando ? 'Guardar cambios' : 'Crear cliente'}
          </Button>
        </>
      }
    >
      <form
        id="form-cliente"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <Input
          label="Nombre y apellido"
          placeholder="Ana Gómez"
          autoFocus
          disabled={isSubmitting}
          error={errors.nombre?.message}
          {...register('nombre')}
        />

        <Input
          label="Teléfono"
          placeholder="11 5555 6666"
          disabled={isSubmitting}
          {...register('telefono')}
        />

        <Input
          label="Notas"
          placeholder="Paga los viernes"
          disabled={isSubmitting}
          {...register('notas')}
        />
      </form>
    </Modal>
  )
}
