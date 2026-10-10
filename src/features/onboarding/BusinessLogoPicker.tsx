import { useCallback, useState, type ChangeEvent, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { negocioService } from '../../services/negocio.service'
import { useNegocioStore } from '../../stores/negocio.store'
import { businessLogoFileSchema, MIME_A_EXTENSION } from './business.schema'

type LogoPickerValues = {
  logo: FileList
}

type BusinessLogoPickerProps = {
  children: (controls: { openFilePicker: () => void; isUploading: boolean }) => ReactNode
}

export function BusinessLogoPicker({ children }: BusinessLogoPickerProps) {
  const [inputElement, setInputElement] = useState<HTMLInputElement | null>(null)
  const nombre = useNegocioStore((state) => state.nombre)
  const setNegocio = useNegocioStore((state) => state.setNegocio)
  const openFilePicker = useCallback(() => inputElement?.click(), [inputElement])
  const attachInput = useCallback((element: HTMLInputElement | null) => setInputElement(element), [])
  const { register, handleSubmit, resetField, formState: { isSubmitting } } = useForm<LogoPickerValues>()
  const registration = register('logo', {
    validate: (files) => {
      const file = files?.item(0)
      if (!file) return 'Seleccioná una imagen'
      const parsed = businessLogoFileSchema.safeParse(file)
      return parsed.success || parsed.error.issues[0]?.message || 'Seleccioná una imagen válida'
    },
  })

  async function guardarLogo({ logo }: LogoPickerValues) {
    const file = logo.item(0)
    if (!file) return

    const extension = MIME_A_EXTENSION[file.type]
    const negocio = await negocioService.setup({
      nombre,
      logo: { data: await file.arrayBuffer(), extension },
    })
    setNegocio(negocio)
    toast.success('Logo actualizado')
  }

  async function seleccionarLogo(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    try {
      await registration.onChange(event)
      await handleSubmit(guardarLogo, (errors) => {
        toast.error(errors.logo?.message ?? 'No se pudo validar el logo')
      })()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el logo')
    } finally {
      input.value = ''
      resetField('logo')
    }
  }

  return (
    <>
      {children({ openFilePicker, isUploading: isSubmitting })}
      <input
        {...registration}
        ref={(element) => {
          registration.ref(element)
          attachInput(element)
        }}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-label="Seleccionar logo del negocio"
        onChange={(event) => void seleccionarLogo(event)}
      />
    </>
  )
}
