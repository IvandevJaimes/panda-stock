import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { MOD_IS_META } from '../../lib/hotkeys'
import {
  ATRIBUTO_LINEA,
  moverLinea,
  PASO_DE_ACCION,
  resolverAtajo,
  SIN_LINEA,
  VENTANA_DOBLE_ENTER_MS,
  type PasoLinea,
  type TeclaEvento,
} from './posAtajos'
import type { LineaTicket } from './posQuery'

/** En jsdom no hay layout: `clientHeight` y `offsetHeight` dan 0. */
const FILAS_POR_DEFECTO = 8

/** El último control en tocar el teclado se queda con sus teclas. */
const SELECTOR_CONTROL =
  'a[href], button, input, select, textarea, [role="button"], [role="tab"], [contenteditable="true"]'

/** Un modal abierto es dueño de todo el teclado. */
const SELECTOR_DIALOGO = 'dialog, [role="dialog"], [role="alertdialog"]'

function esControl(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(SELECTOR_CONTROL) !== null
}

function esEditable(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest('input, textarea, [contenteditable="true"]') !== null
  )
}

function dentroDeDialogo(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(SELECTOR_DIALOGO) !== null
}

function formaDeEvento(evento: KeyboardEvent): TeclaEvento {
  return {
    key: evento.key,
    code: evento.code,
    ctrl: evento.ctrlKey,
    alt: evento.altKey,
    shift: evento.shiftKey,
    meta: evento.metaKey,
    editable: esEditable(evento.target),
  }
}

function filasDe(lista: HTMLElement | null): HTMLElement[] {
  if (!lista) return []
  return Array.from(lista.querySelectorAll<HTMLElement>(`[${ATRIBUTO_LINEA}]`))
}

/** Cuántas filas entran de una vez, para que PageUp/PageDown salten una pantalla. */
function medirFilas(lista: HTMLElement | null): number {
  const alto = filasDe(lista)[0]?.offsetHeight ?? 0
  if (alto === 0) return FILAS_POR_DEFECTO
  return Math.max(1, Math.floor((lista?.clientHeight ?? 0) / alto))
}

export type OpcionesAtajosPOS = {
  lineas: LineaTicket[]
  busquedaRef: RefObject<HTMLInputElement | null>
  onAumentarUno: (linea: LineaTicket) => void
  onRestarUno: (linea: LineaTicket) => void
  onQuitarLinea: (linea: LineaTicket) => void
  /** `Ctrl+D` pide vaciar; abrir el confirm es cosa de quien lo pidió. */
  onSolicitarVaciar: () => void
  onCobrar: () => void
  onNuevoTicket: () => void
  onCambiarTicket: (delta: number) => void
  onIrAlTicket: (numero: number) => void
  onAbrirMarcas: () => void
  onCambiarMetodoPago: () => void
  onSalirDeBusqueda: () => void
  onSinEfecto?: (mensaje: string) => void
}

export type ResultadoAtajosPOS = {
  lineaSeleccionada: number
  setLineaSeleccionada: (indice: number) => void
  refLista: RefObject<HTMLDivElement | null>
  ayudaAbierta: boolean
  abrirAyuda: () => void
  cerrarAyuda: () => void
  alternarAyuda: () => void
}

export function useAtajosPOS(opciones: OpcionesAtajosPOS): ResultadoAtajosPOS {
  const {
    lineas,
    busquedaRef,
    onAumentarUno,
    onRestarUno,
    onQuitarLinea,
    onSolicitarVaciar,
    onCobrar,
    onNuevoTicket,
    onCambiarTicket,
    onIrAlTicket,
    onAbrirMarcas,
    onCambiarMetodoPago,
    onSalirDeBusqueda,
    onSinEfecto,
  } = opciones

  const [lineaSeleccionada, setLineaSeleccionada] = useState(SIN_LINEA)
  const [ayudaAbierta, setAyudaAbierta] = useState(false)
  const refLista = useRef<HTMLDivElement | null>(null)
  const ultimoEnter = useRef<number | null>(null)

  const total = lineas.length
  const lineaActual =
    lineaSeleccionada >= 0 ? lineas[lineaSeleccionada] : undefined

  // Quitar la última línea deja el índice pasado. En fase de render y no en un
  // `useEffect` para no provocar el segundo render en cascada.
  if (total === 0 && lineaSeleccionada !== SIN_LINEA) setLineaSeleccionada(SIN_LINEA)
  else if (lineaSeleccionada >= total) setLineaSeleccionada(total === 0 ? SIN_LINEA : 0)

  // Sin selección, un atajo de cantidad elige la primera línea: en un ticket
  // recién armado con tres productos, `+` tiene que funcionar sin usar flechas.
  const objetivo = useCallback((): LineaTicket | null => {
    if (lineaActual) return lineaActual
    if (lineas.length === 0) return null
    setLineaSeleccionada(0)
    return lineas[0]
  }, [lineaActual, lineas])

  const mover = useCallback(
    (paso: PasoLinea) => {
      const lista = refLista.current
      const siguiente = moverLinea(
        lineaSeleccionada,
        lineas.length,
        medirFilas(lista),
        paso,
      )
      setLineaSeleccionada(siguiente)
      filasDe(lista)[siguiente]?.scrollIntoView({ block: 'nearest' })
    },
    [lineaSeleccionada, lineas.length],
  )

  const abrirAyuda = useCallback(() => setAyudaAbierta(true), [])
  const cerrarAyuda = useCallback(() => setAyudaAbierta(false), [])
  const alternarAyuda = useCallback(() => setAyudaAbierta((abierto) => !abierto), [])

  useEffect(() => {
    const alPresionar = (evento: KeyboardEvent) => {
      if (dentroDeDialogo(evento.target)) return

      const resuelto = resolverAtajo(formaDeEvento(evento), MOD_IS_META)
      if (!resuelto) return

      // `Enter` es la tecla de activación nativa de botones y links: si hay un
      // control enfocado lo deja actuar. El resto de las teclas peladas son de
      // la app, porque el cajero no tiene que enfocar el ticket para usar `+`,
      // `-` o `Delete` — alcanza con haber tocado algo en la pantalla.
      if (resuelto.accion === 'cobrar' && esControl(evento.target)) return

      evento.preventDefault()

      const { accion } = resuelto
      const paso = PASO_DE_ACCION[accion]
      if (paso) {
        mover(paso)
        return
      }

      switch (accion) {
        case 'enfocarBusqueda':
          busquedaRef.current?.focus()
          busquedaRef.current?.select()
          return

        case 'enfocarCatalogo':
        case 'salirDeBusqueda':
          busquedaRef.current?.blur()
          if (accion === 'salirDeBusqueda') onSalirDeBusqueda()
          return

        case 'agregarUno': {
          const linea = objetivo()
          if (!linea) return onSinEfecto?.('El ticket está vacío')
          onAumentarUno(linea)
          return
        }

        case 'quitarUno': {
          const linea = objetivo()
          if (!linea) return onSinEfecto?.('El ticket está vacío')
          onRestarUno(linea)
          return
        }

        case 'quitarLinea': {
          const linea = objetivo()
          if (!linea) return onSinEfecto?.('El ticket está vacío')
          onQuitarLinea(linea)
          return
        }

        case 'cobrar': {
          const ahora = Date.now()
          const anterior = ultimoEnter.current

          if (anterior !== null && ahora - anterior <= VENTANA_DOBLE_ENTER_MS) {
            // Se reinicia la ventana: tres Enters seguidos cobran una vez.
            ultimoEnter.current = null
            onCobrar()
            return
          }

          // El primer Enter no hace nada a propósito. Es el seguro contra un
          // cobro disparado por un Enter de sincronía con la impresora.
          ultimoEnter.current = ahora
          return
        }

        case 'nuevoTicket':
          return onNuevoTicket()

        case 'ticketAnterior':
          return onCambiarTicket(-1)

        case 'ticketSiguiente':
          return onCambiarTicket(1)

        case 'irAlTicket':
          if (resuelto.numeroTicket !== undefined) onIrAlTicket(resuelto.numeroTicket)
          return

        case 'vaciarTicket':
          return onSolicitarVaciar()

        case 'abrirMarcas':
          return onAbrirMarcas()

        case 'cambiarMetodoPago':
          return onCambiarMetodoPago()

        case 'ayuda':
          return alternarAyuda()
      }
    }

    document.addEventListener('keydown', alPresionar)
    return () => document.removeEventListener('keydown', alPresionar)
  }, [
    mover,
    objetivo,
    busquedaRef,
    onAumentarUno,
    onRestarUno,
    onQuitarLinea,
    onSolicitarVaciar,
    onCobrar,
    onNuevoTicket,
    onCambiarTicket,
    onIrAlTicket,
    onAbrirMarcas,
    onCambiarMetodoPago,
    onSalirDeBusqueda,
    onSinEfecto,
    alternarAyuda,
  ])

  return {
    lineaSeleccionada,
    setLineaSeleccionada,
    refLista,
    ayudaAbierta,
    abrirAyuda,
    cerrarAyuda,
    alternarAyuda,
  }
}
