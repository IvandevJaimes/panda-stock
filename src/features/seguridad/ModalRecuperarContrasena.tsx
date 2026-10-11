import { useEffect, useId, useState, type FormEvent } from 'react'
import { Clipboard, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { seguridadService } from '../../services/seguridad.service'
import { toErrorMessage } from '../../services/errors'

export function ModalRecuperarContrasena({
  onCancel,
  onSuccess,
}: {
  onCancel: () => void
  onSuccess: (pinNuevo: string) => void | Promise<void>
}) {
  const formId = useId()
  const [recoveryId, setRecoveryId] = useState('')
  const [codigo, setCodigo] = useState('')
  const [pinNuevo, setPinNuevo] = useState('')
  const [repeticion, setRepeticion] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [cargandoId, setCargandoId] = useState(true)

  useEffect(() => {
    let activa = true
    void seguridadService.getRecoveryId()
      .then((id) => { if (activa) setRecoveryId(id) })
      .catch((errorDesconocido: unknown) => {
        if (activa) setError(toErrorMessage(errorDesconocido))
      })
      .finally(() => { if (activa) setCargandoId(false) })
    return () => { activa = false }
  }, [])

  const guardar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading) return
    if (!pinNuevo.trim() || pinNuevo.trim() !== repeticion.trim()) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    setError('')
    try {
      const restablecida = await seguridadService.resetearConClave(codigo, pinNuevo)
      if (!restablecida) {
        setError('El código de recuperación no es válido para esta instalación')
        return
      }
      toast.success('Contraseña restablecida')
      await onSuccess(pinNuevo)
    } catch (errorDesconocido) {
      setError(toErrorMessage(errorDesconocido))
    } finally {
      setLoading(false)
    }
  }

  const copiarId = async () => {
    try {
      await navigator.clipboard.writeText(recoveryId)
      toast.success('Código de instalación copiado')
    } catch {
      toast.error('No se pudo copiar el código de instalación')
    }
  }

  const puedeConfirmar = !loading && !cargandoId && Boolean(recoveryId && codigo.trim() && pinNuevo.trim() && repeticion.trim())

  return (
    <Modal
      isOpen
      onClose={onCancel}
      title="Recuperar contraseña"
      subtitle="Solicitá a soporte un código válido para esta instalación."
      headerIcon={<KeyRound size={18} />}
      headerIcon={<KeyRound size={18} />}
      maxWidth="md"
      closeable={false}
      footer={(
        <>
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Volver</Button>
          <Button type="submit" form={formId} loading={loading} disabled={!puedeConfirmar}>Restablecer contraseña</Button>
        </>
      )}
    >
      <form id={formId} onSubmit={(event) => void guardar(event)} className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Código de instalación</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {cargandoId ? 'Cargando…' : recoveryId || 'No disponible'}
            </code>
            <Button type="button" variant="outline" size="sm" icon={<Clipboard size={15} />} onClick={() => void copiarId()} disabled={!recoveryId}>
              Copiar
            </Button>
          </div>
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">Compartí este código con soporte para recibir una clave de recuperación.</p>
        </div>
        <Input id="recovery-code" label="Clave de recuperación de soporte" value={codigo} onChange={(event) => setCodigo(event.target.value)} autoComplete="off" />
        <PasswordInput id="new-password" label="Nueva contraseña" autoComplete="new-password" value={pinNuevo} onChange={(event) => setPinNuevo(event.target.value)} />
        <PasswordInput id="repeat-password" label="Repetir nueva contraseña" autoComplete="new-password" value={repeticion} onChange={(event) => setRepeticion(event.target.value)} error={repeticion && pinNuevo.trim() !== repeticion.trim() ? 'Las contraseñas no coinciden' : undefined} />
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </form>
    </Modal>
  )
}
