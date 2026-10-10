import { useState, type FormEvent, type ReactNode } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { useId } from 'react'
import { toast } from 'sonner'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { toErrorMessage } from '../../services/errors'
import { ErrorSeguridad } from '../../services/errors'
import { ModalRecuperarContrasena } from './ModalRecuperarContrasena'

interface ModalContrasenaProps {
  titulo: string
  subtitulo?: string
  onSubmit: (contrasena: string) => Promise<boolean>
  onCancelar: () => void
  /** Etiqueta del botón de cancelar. Por defecto el del ruteador, "Volver al POS". */
  etiquetaCancelar?: string
  /** Etiqueta del botón de confirmar. Por defecto "Entrar". */
  etiquetaConfirmar?: string
  /** Variante del botón de confirmar. Por defecto la primaria (emerald). */
  confirmarVariant?: 'primary' | 'danger'
  /** Icono del botón de confirmar. */
  confirmarIcon?: ReactNode
  /** Se ejecuta cuando la contraseña es válida */
  onSuccess?: (contrasena: string) => void | Promise<void>

}

export function ModalContrasena({
  titulo,
  subtitulo,
  onSubmit,
  onCancelar,
  etiquetaCancelar = 'Volver al POS',
  etiquetaConfirmar = 'Entrar',
  confirmarVariant = 'primary',
  confirmarIcon,
  onSuccess,
}: ModalContrasenaProps) {
  const formId = useId()
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState('')
  const [mostrarContrasena, setMostrarContrasena] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [modoRecuperacion, setModoRecuperacion] = useState(false)

  const manejarSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (enviando) return
    if (!contrasena.trim()) {
      setError('Ingresá la contraseña')
      return
    }

    setEnviando(true)
    setError('')

    try {
      const valida = await onSubmit(contrasena)
      setContrasena('')

      if (valida) {
        await onSuccess?.(contrasena)
      } else {
        setError('Contraseña incorrecta')
      }
    } catch (errorDesconocido) {
      setContrasena('')
      if (errorDesconocido instanceof ErrorSeguridad && errorDesconocido.code === 'INVALID_PIN') {
        setError('Contraseña incorrecta')
      } else {
        toast.error(toErrorMessage(errorDesconocido))
      }
    } finally {
      setEnviando(false)
    }
  }

  const volverAlIngreso = () => {
    setModoRecuperacion(false)
  }

  if (modoRecuperacion) {
    return (
      <ModalRecuperarContrasena
        onCancel={volverAlIngreso}
        onSuccess={async (pinNuevo) => {
          setModoRecuperacion(false)
          await onSuccess?.(pinNuevo)
        }}
      />
    )
  }

  return (
    <Modal
      isOpen
      onClose={() => {}}
      title={titulo}
      subtitle={subtitulo}
      headerIcon={<Lock size={18} />}
      footer={(
        <>
          <Button type="button" variant="outline" onClick={onCancelar} disabled={enviando}>
            {etiquetaCancelar}
          </Button>
          <Button type="submit" form={formId} variant={confirmarVariant} loading={enviando} disabled={!contrasena.trim()} icon={confirmarIcon}>
            {etiquetaConfirmar}
          </Button>
        </>
      )}
      closeable={false}
    >
      <form id={formId} onSubmit={manejarSubmit} className="flex flex-col gap-5">
          <Input
            autoFocus
            id="contrasena"
            label="Contraseña"
            type={mostrarContrasena ? 'text' : 'password'}
            required
            value={contrasena}
            onChange={(event) => setContrasena(event.target.value)}
            error={error}
            leftIcon={<Lock size={16} />}
            rightAction={
              <button
                type="button"
                onClick={() => setMostrarContrasena((visible) => !visible)}
                aria-label={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
              >
                {mostrarContrasena ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />
          <button
            type="button"
            onClick={() => {
              setError('')
              setModoRecuperacion(true)
            }}
            disabled={enviando}
            className="-mt-3 self-start cursor-pointer text-sm font-medium text-emerald-700 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            Olvidé mi contraseña
          </button>
      </form>
    </Modal>
  )
}
