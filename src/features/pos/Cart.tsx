import { useState } from 'react'
import { ShoppingBag, Ticket, Trash2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Button } from '../../components/ui/Button'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { CartItem } from './CartItem'
import { PaymentMethodSelector } from './PaymentMethodSelector'
import { formatearMoneda, type MetodoPagoPOS, type ResumenTicket } from './posQuery'

type CartProps = {
  resumen: ResumenTicket
  metodoPago: MetodoPagoPOS
  /**
   * Solo se usa como `key` del contenido. Al cambiar, React desmonta y vuelve a
   * montar el nodo, y eso es lo que dispara la animación de entrada: no hace
   * falta que la animación sepa nada del ticket, alcanza con que la identidad
   * del nodo cambie. También reinicia el scroll, que es lo que se quiere al
   * saltar a otra venta.
   */
  activeTicketId: string
  onCambiarMetodoPago: (metodo: MetodoPagoPOS) => void
  onCambiarCantidad: (productoId: number, cantidad: number) => void
  onQuitar: (productoId: number) => void
  onVaciar: () => void
  onCobrar: () => void
}

export function Cart({
  resumen,
  metodoPago,
  activeTicketId,
  onCambiarMetodoPago,
  onCambiarCantidad,
  onQuitar,
  onVaciar,
  onCobrar,
}: CartProps) {
  const [confirmandoVaciar, setConfirmandoVaciar] = useState(false)
  const vacio = resumen.unidades === 0

  return (
    // `min-h-0 flex-1` en vez de `sticky top-4`: el `sticky` pasó a la
    // columna que envuelve ticket + pestañas, y el alto lo reparte el flex de
    // esa columna. Acá el panel solo ocupa lo que queda debajo de las pestañas.
    <aside className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg max-[1100px]:static dark:border-slate-800 dark:bg-[#111827]">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white px-[22px] py-[18px] dark:border-slate-800 dark:from-secondary/40 dark:to-[#111827]">
        <div className="flex items-center gap-2.5">
          <Ticket size={20} className="shrink-0 text-emerald-500" aria-hidden="true" />
          <h2 className="font-display text-[17px] tracking-tight text-slate-900 dark:text-slate-100">
            Ticket de venta
          </h2>
        </div>

        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-[3px] font-display text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
          {resumen.unidades} {resumen.unidades === 1 ? 'ítem' : 'ítems'}
        </span>
      </div>

      {/* Todo lo que cambia al cambiar de pestaña va dentro de este nodo con
          `key`. React lo desmonta y monta de nuevo, y como la animación CSS de
          `.animate-entry-fade` arranca sola en el montaje, el fade se repite en
          cada cambio sin que ninguna clase ni estado tenga que saber que hay
          pestañas. `.animate-entry-up` serviría mal: arrastra 6px hacia abajo y
          el contenido no entra desde abajo, cambia de golpe. */}
      <div
        key={activeTicketId}
        className="flex min-h-0 flex-1 animate-entry-fade flex-col"
      >
        {/* El scroll va acá y en ningún otro lado: es el único hijo que puede
            crecer sin límites. `min-h-0` es obligatorio — sin él, el `flex-1`
            no baja de su altura de contenido y el flexbox le roba espacio a las
            secciones de abajo en vez de dejar que esta se desplace. */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-[22px] py-2.5">
          {vacio ? (
            <div className="flex flex-col items-center justify-center gap-1.5 px-4 py-12 text-center">
              <ShoppingBag
                size={42}
                strokeWidth={1.6}
                className="mb-1 text-slate-300 dark:text-slate-600"
                aria-hidden="true"
              />
              <p className="font-display text-[15px] font-semibold text-slate-600 dark:text-slate-400">
                Sin productos todavía
              </p>
              <span className="text-[13px] text-slate-500 dark:text-slate-500">
                Elegí del catálogo para armar la venta
              </span>
            </div>
          ) : (
            resumen.lineas.map((linea) => (
              <CartItem
                key={linea.productoId}
                linea={linea}
                onCambiarCantidad={onCambiarCantidad}
                onQuitar={onQuitar}
              />
            ))
          )}
        </div>

        {/* Cierra la zona scrolleable: sin este límite, la última fila de items
            queda pegada al "Subtotal" y se lee como una sola lista corrida.
            El borde da la línea y la sombra da la profundidad de "esto scrollea
            por debajo". En dark mode la sombra se apaga a propósito: un rgba
            negro sobre fondo negro no se ve, y el peso visual lo aporta el
            borde, que es el único separador que funciona en los dos temas. */}
        <div className="shrink-0 border-t border-slate-200 px-[22px] pt-2 pb-2 shadow-[0_-4px_6px_-4px_rgba(15,23,42,0.10)] dark:border-slate-800 dark:shadow-none">
          <div className="flex items-baseline justify-between py-1 text-[13.5px] text-slate-600 dark:text-slate-400">
            <span>Subtotal</span>
            <span className="font-display font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {formatearMoneda(resumen.subtotal)}
            </span>
          </div>

          {resumen.descuento > 0 && (
            <div className="flex items-baseline justify-between py-1 text-[13.5px] text-emerald-600 dark:text-emerald-400">
              <span>Descuento mayorista</span>
              <span className="font-display font-semibold tabular-nums">
                −{formatearMoneda(resumen.descuento)}
              </span>
            </div>
          )}

          <div className="mt-1 flex items-baseline justify-between border-t border-slate-200 pt-2 dark:border-slate-800">
            <span className="font-display text-[15px] font-bold text-slate-900 dark:text-slate-100">
              Total
            </span>
            <span className="font-display bg-gradient-to-br from-emerald-700 to-emerald-600 bg-clip-text text-[22px] font-extrabold tracking-tight tabular-nums text-emerald-700 dark:from-emerald-400 dark:to-emerald-500 dark:text-transparent">
              {formatearMoneda(resumen.total)}
            </span>
          </div>
        </div>
      </div>

      <PaymentMethodSelector valor={metodoPago} onChange={onCambiarMetodoPago} />

      <div className="grid shrink-0 grid-cols-[auto_1fr] gap-3 border-t border-slate-200 px-[22px] pt-3 pb-3.5 max-[600px]:grid-cols-1 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setConfirmandoVaciar(true)}
          disabled={vacio}
          className={cn(
            'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-transparent px-[18px] py-2.5 font-display text-sm font-semibold text-slate-600 transition-colors duration-150',
            'hover:border-red-300 hover:bg-red-500/10 hover:text-red-600 dark:border-slate-800 dark:text-slate-400 dark:hover:border-red-500/40 dark:hover:bg-red-500/10 dark:hover:text-red-400',
            'disabled:pointer-events-none disabled:opacity-50',
          )}
        >
          <Trash2 size={17} className="shrink-0" aria-hidden="true" />
          Vaciar
        </button>

        {/*
          `variant="primary"` de la Button compartida: sólido, con icono y texto
          en blanco. El botón de cobrar es la acción principal de la pantalla y
          tiene que leerse como una sola señal, no como un degradado que compita
          con el verde del catálogo. Además deja de ser un <button> con clases a
          mano: focus-visible, disabled y cursor salen de la primitiva.
        */}
        <Button
          variant="primary"
          icon={<ShoppingBag size={19} />}
          onClick={onCobrar}
          disabled={vacio}
          className="min-h-[44px] px-[18px] py-2 font-display text-[15px] font-semibold tracking-wide shadow-sm hover:shadow-md"
        >
          Cobrar
        </Button>
      </div>

      {/* Vaciar el ticket tira trabajo de armado: si el cajero lo pulsa sin
          querer, se pierde la venta entera y no hay forma de recuperarla. Por
          eso pide confirmación. */}
      <ConfirmModal
        isOpen={confirmandoVaciar}
        onClose={() => setConfirmandoVaciar(false)}
        onConfirm={() => {
          onVaciar()
        }}
        title="Vaciar ticket"
        description="Se van a quitar todos los productos del ticket. No se puede deshacer."
        confirmText="Vaciar"
      />
    </aside>
  )
}
