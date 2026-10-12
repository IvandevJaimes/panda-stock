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
import { ToggleActivoCliente } from './ToggleActivoCliente'

type FormValues = {
  nombre: string
  telefono: string
  notas: string
}

function esTelefonoArgentinoValido(telefono: string): boolean {
  const valor = telefono.trim()
  if (!valor) return true
  if (!/^\+?[\d\s().-]+$/.test(valor) || (valor.includes('+') && !valor.startsWith('+'))) {
    return false
  }

  let digitos = valor.replace(/\D/g, '')
  if (digitos.startsWith('0054')) {
    digitos = digitos.slice(4)
  } else if (digitos.startsWith('54') && digitos.length > 10) {
    digitos = digitos.slice(2)
  }

  if (digitos.length === 11 && digitos.startsWith('9')) digitos = digitos.slice(1)
  if (digitos.length === 11 && digitos.startsWith('0')) digitos = digitos.slice(1)

  return /^[12368]\d{9}$/.test(digitos)
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

  const telefonoRegistro = register('telefono', {
    validate: (valor) =>
      esTelefonoArgentinoValido(valor) || 'Ingresá un número de teléfono válido',
  })

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editando ? 'Editar cliente' : 'Nuevo cliente'}
      headerIcon={<User size={18} className="text-emerald-600 dark:text-emerald-400" />}
      maxWidth="md"
      closeable={!isSubmitting}
      headerExtra={cliente ? (
        <ToggleActivoCliente
          cliente={cliente}
          onChanged={() => onSuccess()}
          onDesactivado={onClose}
        />
      ) : undefined}
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
            capitalizeWords
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

        <div className="flex flex-col gap-1.5">
          <Input
            label="Teléfono (opcional)"
            placeholder="+54"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            disabled={isSubmitting}
            {...telefonoRegistro}
            onChange={(event) => {
              const input = event.currentTarget
              const valor = input.value
              const valorNumerico = valor.replace(/\D/g, '')
              const posicion = input.selectionStart
              input.value = valorNumerico
              if (posicion !== null && valor !== valorNumerico) {
                const eliminadosAntesDelCursor = valor.slice(0, posicion).replace(/\d/g, '').length
                input.setSelectionRange(posicion - eliminadosAntesDelCursor, posicion - eliminadosAntesDelCursor)
              }
              void telefonoRegistro.onChange(event)
            }}
          />
          <FieldError error={errors.telefono?.message} />
        </div>

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
