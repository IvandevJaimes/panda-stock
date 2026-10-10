import { useState, type FormEvent, type ReactNode } from 'react'
import { Eye, EyeOff, KeyRound, Lock } from 'lucide-react'
import { useId } from 'react'
import { toast } from 'sonner'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { Button } from '../../components/ui/Button'
import { toErrorMessage } from '../../services/errors'
import { seguridadService } from '../../services/seguridad.service'

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
  onSuccess?: () => void | Promise<void>

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
  const [pinMaestro, setPinMaestro] = useState('')
  const [contrasenaNueva, setContrasenaNueva] = useState('')
  const [repetirContrasena, setRepetirContrasena] = useState('')
  const [errorRecuperacion, setErrorRecuperacion] = useState('')

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
        await onSuccess?.()
      } else {
        setError('Contraseña incorrecta')
      }
    } catch (errorDesconocido) {
      setContrasena('')
      toast.error(toErrorMessage(errorDesconocido))
    } finally {
      setEnviando(false)
    }
  }

  const manejarRecuperacion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (enviando) return
    if (!pinMaestro.trim() || !contrasenaNueva.trim() || !repetirContrasena.trim()) {
      setErrorRecuperacion('Completá todos los campos')
      return
    }
    if (contrasenaNueva !== repetirContrasena) {
      setErrorRecuperacion('Las contraseñas no coinciden')
      return
    }

    setEnviando(true)
    setErrorRecuperacion('')
    try {
      const actualizada = await seguridadService.changePin(pinMaestro, contrasenaNueva)
      if (!actualizada) {
        setErrorRecuperacion('El PIN maestro es incorrecto')
        setPinMaestro('')
        return
      }

      const valida = await onSubmit(contrasenaNueva)
      if (!valida) {
        setContrasena(contrasenaNueva)
        setModoRecuperacion(false)
        setError('La contraseña se actualizó. Ingresala para continuar.')
        setPinMaestro('')
        setContrasenaNueva('')
        setRepetirContrasena('')
        return
      }

      toast.success('Contraseña actualizada')
      setPinMaestro('')
      setContrasenaNueva('')
      setRepetirContrasena('')
      await onSuccess?.()
    } catch (errorDesconocido) {
      toast.error(toErrorMessage(errorDesconocido))
    } finally {
      setEnviando(false)
    }
  }

  const volverAlIngreso = () => {
    setModoRecuperacion(false)
    setPinMaestro('')
    setContrasenaNueva('')
    setRepetirContrasena('')
    setErrorRecuperacion('')
  }

  return (
    <Modal
      isOpen
      onClose={() => {}}
      title={modoRecuperacion ? 'Recuperar contraseña' : titulo}
      subtitle={modoRecuperacion
        ? 'Ingresá el PIN maestro de los desarrolladores y elegí una contraseña nueva.'
        : subtitulo}
      headerIcon={modoRecuperacion ? <KeyRound size={18} /> : <Lock size={18} />}
      footer={modoRecuperacion ? (
        <>
          <Button type="button" variant="outline" onClick={volverAlIngreso} disabled={enviando}>
            Volver
          </Button>
          <Button type="submit" form={`${formId}-recuperacion`} loading={enviando}>
            Cambiar contraseña
          </Button>
        </>
      ) : (
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
      {modoRecuperacion ? (
        <form id={`${formId}-recuperacion`} onSubmit={manejarRecuperacion} className="flex flex-col gap-5">
          <PasswordInput
            autoFocus
            id="pin-maestro-recuperacion"
            label="PIN maestro"
            value={pinMaestro}
            onChange={(event) => setPinMaestro(event.target.value)}
            error={errorRecuperacion.includes('PIN maestro') || errorRecuperacion.includes('campos') ? errorRecuperacion : undefined}
            leftIcon={<KeyRound size={16} />}
          />
          <PasswordInput
            id="nueva-contrasena-recuperacion"
            label="Nueva contraseña"
            value={contrasenaNueva}
            onChange={(event) => setContrasenaNueva(event.target.value)}
            leftIcon={<Lock size={16} />}
          />
          <PasswordInput
            id="repetir-contrasena-recuperacion"
            label="Repetir contraseña"
            value={repetirContrasena}
            onChange={(event) => setRepetirContrasena(event.target.value)}
            error={errorRecuperacion.includes('coinciden') ? errorRecuperacion : undefined}
            leftIcon={<Lock size={16} />}
          />
          {errorRecuperacion && !errorRecuperacion.includes('PIN maestro') && !errorRecuperacion.includes('campos') && !errorRecuperacion.includes('coinciden') && (
            <p role="alert" className="-mt-3 text-sm text-red-600 dark:text-red-400">{errorRecuperacion}</p>
          )}
        </form>
      ) : (
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
      )}
    </Modal>
  )
}
