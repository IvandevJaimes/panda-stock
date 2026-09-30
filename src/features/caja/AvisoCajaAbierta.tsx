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
    <Modal
      isOpen={avisoAbierto}
      onClose={cerrar}
      title="La caja está abierta"
      subtitle="No podés salir del programa sin cerrarla"
      headerIcon={<ShieldCheck size={18} />}
      maxWidth="md"
      footer={
        <>
          <Button variant="outline" onClick={cerrar}>
            Seguir en el programa
          </Button>
          <Button
            onClick={() => {
              setAvisoAbierto(false)
              solicitarCierre()
            }}
          >
            Cerrar caja y salir
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        Hay una caja abierta con ventas imputadas. Si salís sin cerrarla, el turno queda sin arqueo:
        no se sabe cuánto efectivo había, cuánto se cobró ni qué diferencia hubo.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        Contá la gaveta, revisá la diferencia y cerrá la caja. Al confirmar, el programa se cierra
        solo.
      </p>
    </Modal>
  )
}
