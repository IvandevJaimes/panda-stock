import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { User } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { CapitalizedInput } from '../../components/ui/CapitalizedInput'
import { FieldError } from '../../components/ui/FieldError'
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
  onSuccess: (cliente?: Cliente) => void
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
    setValue,
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

    const payload: ClienteInput = {
      nombre,
      telefono: data.telefono.trim() || null,
      notas: data.notas.trim() || null,
    }

    try {
      if (cliente) {
        await cuentasCorrientesService.actualizarCliente(cliente.id, payload)
        toast.success('Cliente actualizado')
        onSuccess()
      } else {
        const nuevo = await cuentasCorrientesService.crearCliente(payload)
        toast.success('Cliente creado')
        onSuccess(nuevo)
      }
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
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="nombre"
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Nombre y apellido
          </label>
          <CapitalizedInput
            id="nombre"
            placeholder="Ana Gómez"
            autoFocus
            disabled={isSubmitting}
            onClear={() => setValue('nombre', '')}
            {...register('nombre', {
              required: 'El nombre y apellido es obligatorio',
              minLength: {
                value: 2,
                message: 'Mínimo 2 caracteres',
              },
              validate: {
                noSoloEspacios: (valor) =>
                  valor.trim().length > 0 || 'El nombre y apellido es obligatorio',
              },
            })}
          />
          <FieldError error={errors.nombre?.message} />
        </div>

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
