import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { useCajaStore } from '../../stores/caja.store'

/**
 * Avisa que el main frenó el cierre porque había caja abierta. No decide nada:
 * confirma y delega el arqueo al `CerrarCajaModal` que ya está montado en el
 * header, o cancela y deja la app como estaba.
 *
 * Va en `AppLayout` y no en `CajaControl` porque tiene que existir aunque el
 * header se esté por cerrar: es la red que evita perder el cierre del turno.
 */
export function AvisoCajaAbierta() {
  const [avisoAbierto, setAvisoAbierto] = useState(false)
  const solicitarCierre = useCajaStore((state) => state.solicitarCierre)
  const cancelarCierre = useCajaStore((state) => state.cancelarCierre)

  useEffect(() => {
    window.electronAPI.app.onPedirCierre(() => setAvisoAbierto(true))
  }, [])

  const cerrar = () => {
    setAvisoAbierto(false)
    cancelarCierre()
  }

  return (
    <CajaAbiertaModal
      isOpen={avisoAbierto}
      onClose={cerrar}
      contexto="salida"
      onConfirmarCierre={() => {
        setAvisoAbierto(false)
        solicitarCierre()
      }}
    />
  )
}

export function CajaAbiertaModal({
  isOpen,
  onClose,
  contexto,
  onConfirmarCierre,
}: {
  isOpen: boolean
  onClose: () => void
  contexto: 'salida' | 'restauracion'
  onConfirmarCierre?: () => void
}) {
  const esSalida = contexto === 'salida'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="La caja está abierta"
      subtitle={esSalida ? 'No podés salir del programa sin cerrarla' : 'No podés restaurar una copia con la caja abierta'}
      headerIcon={<ShieldCheck size={18} />}
      maxWidth="md"
      footer={esSalida ? (
        <>
          <Button variant="outline" onClick={onClose}>Seguir en el programa</Button>
          <Button onClick={onConfirmarCierre}>Cerrar caja y salir</Button>
        </>
      ) : (
        <Button onClick={onClose}>Entendido</Button>
      )}
    >
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {esSalida
          ? 'Hay una caja abierta con ventas imputadas. Si salís sin cerrarla, el turno queda sin arqueo: no se sabe cuánto efectivo había, cuánto se cobró ni qué diferencia hubo.'
          : 'Hay una caja abierta con ventas imputadas. Si restaurás ahora, se reemplazarán los datos del negocio mientras el turno sigue sin cerrar.'}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {esSalida
          ? 'Contá la gaveta, revisá la diferencia y cerrá la caja. Al confirmar, el programa se cierra solo.'
          : 'Cerrá la caja desde el control de caja y volvé a iniciar la restauración.'}
      </p>
    </Modal>
  )
}
