import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Building2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { CapitalizedInput } from '../../components/ui/CapitalizedInput'
import { ImageDropzone } from '../../components/ui/ImageDropzone'
import { FieldError } from '../../components/ui/FieldError'
import { negocioService } from '../../services/negocio.service'
import { MIME_A_EXTENSION, businessSchema, type BusinessSetupValues } from './business.schema'
import type { Negocio } from '../../../electron/db/types'

type BusinessSetupModalProps = {
  isOpen: boolean
  onSuccess: (negocio: Negocio) => void
  onClose?: () => void
  closable?: boolean
  initialNombre?: string
  initialLogoUrl?: string | null
}

export function BusinessSetupModal({
  isOpen,
  onSuccess,
  onClose,
  closable = false,
  initialNombre,
  initialLogoUrl,
}: BusinessSetupModalProps) {
  const [guardando, setGuardando] = useState(false)
  const { register, control, handleSubmit, formState, setError, clearErrors, reset } =
    useForm<BusinessSetupValues>({
      defaultValues: { nombre: '', logo: null },
    })

  useEffect(() => {
    if (isOpen) reset({ nombre: initialNombre ?? '', logo: null })
  }, [isOpen, initialNombre, reset])

  const submit = handleSubmit(async (values) => {
    clearErrors()
    const parsed = businessSchema.safeParse(values)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === 'nombre') setError('nombre', { message: issue.message })
        if (issue.path[0] === 'logo') setError('logo', { message: issue.message })
      }
      return
    }

    const logo = parsed.data.logo
    setGuardando(true)
    try {
      const negocio = await negocioService.setup({
        nombre: parsed.data.nombre.trim(),
        logo: logo
          ? { data: await logo.arrayBuffer(), extension: MIME_A_EXTENSION[logo.type] ?? 'png' }
          : null,
      })
      toast.success('Negocio configurado correctamente')
      onSuccess(negocio)
    } catch {
      toast.error('No se pudo guardar la configuración, intentá de nuevo')
    } finally {
      setGuardando(false)
    }
  })

  const nombreRegister = register('nombre')

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose ?? (() => {})}
      closeable={closable}
      title={closable ? 'Editar información del negocio' : 'Configura tu negocio'}
      subtitle="Estos datos se muestran en la barra superior"
      headerIcon={<Building2 size={18} />}
      maxWidth="md"
      footer={
        <Button
          type="submit"
          form="business-setup-form"
          loading={guardando}
          icon={<Save size={16} />}
        >
          Guardar
        </Button>
      }
    >
      <form id="business-setup-form" onSubmit={submit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="business-setup-nombre"
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Nombre del negocio
          </label>
          <CapitalizedInput
            id="business-setup-nombre"
            placeholder="Ej: Almacén La Esquina"
            autoFocus
            {...nombreRegister}
            onChange={(e) => {
              nombreRegister.onChange(e)
              clearErrors('nombre')
            }}
            onClear={() => clearErrors('nombre')}
          />
          <FieldError error={formState.errors.nombre?.message} />
        </div>

        <Controller
          control={control}
          name="logo"
          render={({ field }) => (
            <ImageDropzone
              value={field.value ?? initialLogoUrl ?? null}
              onChange={(file) => {
                clearErrors('logo')
                field.onChange(file)
              }}
              error={formState.errors.logo?.message}
            />
          )}
        />
      </form>
    </Modal>
  )
}