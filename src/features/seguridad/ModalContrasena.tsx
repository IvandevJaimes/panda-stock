import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { toErrorMessage } from '../../services/errors'

interface ModalContrasenaProps {
  titulo: string
  subtitulo: string
  onSubmit: (contrasena: string) => Promise<boolean>
  onCancelar: () => void
  /** Etiqueta del botón de cancelar. Por defecto el del ruteador, "Volver al POS". */
  etiquetaCancelar?: string
  /** Se ejecuta cuando la contraseña es válida */
  onSuccess?: () => void

}

export function ModalContrasena({
  titulo,
  subtitulo,
  onSubmit,
  onCancelar,
  etiquetaCancelar = 'Volver al POS',
  onSuccess,
}: ModalContrasenaProps) {
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState('')
  const [mostrarContrasena, setMostrarContrasena] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const manejarSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (enviando) return

    setEnviando(true)
    setError('')

    try {
      const valida = await onSubmit(contrasena)
      setContrasena('')

      if (valida) {
        onSuccess?.()
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

  return (
    <Modal
      isOpen
      onClose={() => {}}
      title={titulo}
      subtitle={subtitulo}
      headerIcon={<Lock size={18} />}
      closeable={false}
    >
      <form onSubmit={manejarSubmit} className="flex flex-col gap-5">
        <Input
          autoFocus
          id="contrasena"
          label="Contraseña"
          type={mostrarContrasena ? 'text' : 'password'}
          value={contrasena}
          onChange={(event) => setContrasena(event.target.value)}
          error={error}
          leftIcon={<Lock size={16} />}
          rightAction={
            <button
              type="button"
              onClick={() => setMostrarContrasena((visible) => !visible)}
              aria-label={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="cursor-pointer text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
            >
              {mostrarContrasena ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancelar}
            disabled={enviando}
          >
            {etiquetaCancelar}
          </Button>
          <Button type="submit" loading={enviando}>
            Entrar
          </Button>
        </div>
      </form>
    </Modal>
  )
}
