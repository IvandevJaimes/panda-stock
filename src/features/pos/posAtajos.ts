export type TeclaEvento = {
  key: string
  code: string
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
  /** El foco está en un input/textarea/contenteditable. */
  editable: boolean
}

export type AccionAtajo =
  | 'enfocarBusqueda'
  | 'enfocarCatalogo'
  | 'salirDeBusqueda'
  | 'moverArriba'
  | 'moverAbajo'
  | 'irAlPrimero'
  | 'irAlUltimo'
  | 'paginaArriba'
  | 'paginaAbajo'
  | 'agregarUno'
  | 'quitarUno'
  | 'quitarLinea'
  | 'vaciarTicket'
  | 'cobrar'
  | 'nuevoTicket'
  | 'ticketAnterior'
  | 'ticketSiguiente'
  | 'irAlTicket'
  | 'abrirMarcas'
  | 'cambiarMetodoPago'
  | 'ayuda'

/** `numeroTicket` viaja con la acción para no mutar el contexto recibido. */
export type AtajoResuelto = {
  accion: AccionAtajo
  numeroTicket?: number
}


function esTecla(evento: TeclaEvento, teclas: string[]): boolean {
  if (evento.ctrl || evento.meta || evento.alt) return false
  return teclas.includes(evento.key.toLowerCase())
}

// `+` y `-` por símbolo o por `code` del numpad, con o sin Shift. No se pueden
// registrar en `useHotkey`: `parseHotkey` parte la cadena por `+` y un "+"
// literal se descompone en dos partes vacías.
function esMas(evento: TeclaEvento): boolean {
  if (evento.editable) return false
  if (evento.ctrl || evento.meta || evento.alt) return false
  return evento.key === '+' || evento.code === 'NumpadAdd'
}

function esMenos(evento: TeclaEvento): boolean {
  if (evento.editable) return false
  if (evento.ctrl || evento.meta || evento.alt) return false
  return evento.key === '-' || evento.code === 'NumpadSubtract'
}

/** Del `code` y no del `key`, que con Alt depende del layout. */
function digitoDeAtajo(evento: TeclaEvento): number | null {
  const coincidencia = /^(?:Digit|Numpad)([1-9])$/.exec(evento.code)
  if (!coincidencia) return null
  return Number(coincidencia[1]) <= 5 ? Number(coincidencia[1]) : null
}

/**
 * Con el foco en un campo editable solo pasan las teclas de función, `Escape` y
 * `Enter`: el buscador es un input de texto y las flechas tienen que mover su
 * cursor. Las de función no escriben nada, así que se dejan pasar siempre.
 */
export function resolverAtajo(
  evento: TeclaEvento,
  modEsMeta: boolean,
): AtajoResuelto | null {
  if (evento.editable) {
    if (esTecla(evento, ['f1'])) return { accion: 'ayuda' }
    if (esTecla(evento, ['f2'])) return { accion: 'enfocarBusqueda' }
    if (esTecla(evento, ['f4'])) return { accion: 'cambiarMetodoPago' }
    if (evento.key === 'Escape' || evento.key === 'Enter') {
      return { accion: 'salirDeBusqueda' }
    }
    return null
  }

  if (esTecla(evento, ['f1'])) return { accion: 'ayuda' }
  if (esTecla(evento, ['f2'])) return { accion: 'enfocarBusqueda' }
  if (esTecla(evento, ['f3'])) return { accion: 'enfocarCatalogo' }
  if (esTecla(evento, ['f4'])) return { accion: 'cambiarMetodoPago' }

  if (esMas(evento)) return { accion: 'agregarUno' }
  if (esMenos(evento)) return { accion: 'quitarUno' }

  const mod = modEsMeta ? evento.meta : evento.ctrl
  const otroMod = modEsMeta ? evento.ctrl : evento.meta

  if (mod && !otroMod && !evento.alt) {
    switch (evento.key.toLowerCase()) {
      case 'd':
        return { accion: 'vaciarTicket' }
      case 'n':
        return { accion: 'nuevoTicket' }
      case 'm':
        return { accion: 'abrirMarcas' }
      default:
        return null
    }
  }

  if (evento.alt && !evento.ctrl && !evento.meta) {
    const numero = digitoDeAtajo(evento)
    if (numero !== null) return { accion: 'irAlTicket', numeroTicket: numero }
    return null
  }

  if (esTecla(evento, ['delete'])) return { accion: 'quitarLinea' }

  if (evento.key === 'Enter') return { accion: 'cobrar' }

  switch (evento.key) {
    case 'ArrowUp':
      return { accion: 'moverArriba' }
    case 'ArrowDown':
      return { accion: 'moverAbajo' }
    case 'ArrowLeft':
      return { accion: 'ticketAnterior' }
    case 'ArrowRight':
      return { accion: 'ticketSiguiente' }
    case 'Home':
      return { accion: 'irAlPrimero' }
    case 'End':
      return { accion: 'irAlUltimo' }
    case 'PageUp':
      return { accion: 'paginaArriba' }
    case 'PageDown':
      return { accion: 'paginaAbajo' }
    default:
      return null
  }
}

/** `-1` significa "no hay línea seleccionada". */
export const SIN_LINEA = -1

/** Las flechas de arriba y abajo recorren las líneas; las de izquierda y derecha cambian de ticket. */
export type PasoLinea =
  | 'arriba'
  | 'abajo'
  | 'inicio'
  | 'fin'
  | 'pagina-arriba'
  | 'pagina-abajo'

/** Mueve la selección por las líneas del ticket y la deja siempre dentro del rango. */
export function moverLinea(
  indice: number,
  total: number,
  filasVisibles: number,
  paso: PasoLinea,
): number {
  if (total <= 0) return SIN_LINEA

  const ultimo = total - 1
  if (indice < 0) return paso === 'fin' ? ultimo : 0

  const filas = Math.max(1, Math.floor(filasVisibles))
  let destino: number
  switch (paso) {
    case 'arriba':
      destino = indice - 1
      break
    case 'abajo':
      destino = indice + 1
      break
    case 'inicio':
      destino = 0
      break
    case 'fin':
      destino = ultimo
      break
    case 'pagina-arriba':
      destino = indice - filas
      break
    case 'pagina-abajo':
      destino = indice + filas
      break
  }

  if (destino < 0) return 0
  if (destino > ultimo) return ultimo
  return destino
}

export const PASO_DE_ACCION: Partial<Record<AccionAtajo, PasoLinea>> = {
  moverArriba: 'arriba',
  moverAbajo: 'abajo',
  irAlPrimero: 'inicio',
  irAlUltimo: 'fin',
  paginaArriba: 'pagina-arriba',
  paginaAbajo: 'pagina-abajo',
}

/** Dos Enter deliberados entran en 150-250ms; la pausa antes de cobrar, no. */
export const VENTANA_DOBLE_ENTER_MS = 400

export function etiquetaMod(modEsMeta: boolean): string {
  return modEsMeta ? 'Cmd' : 'Ctrl'
}

/** Para medir y traer filas a la vista sin una ref por fila. Lo escribe `CartItem`. */
export const ATRIBUTO_LINEA = 'data-linea-ticket'

export type GrupoAtajo = 'Navegación' | 'Ticket' | 'Búsqueda' | 'General'

export type EntradaAyuda = {
  accion: AccionAtajo
  /** Notación W3C de `aria-keyshortcuts`, con el modificador ya resuelto. */
  teclas: string
  rotulo: string
  grupo: GrupoAtajo
}

export function tablaAtajos(modEsMeta: boolean): EntradaAyuda[] {
  const mod = etiquetaMod(modEsMeta)
  return [
    { accion: 'moverArriba', teclas: 'ArrowUp', rotulo: 'Línea de arriba', grupo: 'Navegación' },
    { accion: 'moverAbajo', teclas: 'ArrowDown', rotulo: 'Línea de abajo', grupo: 'Navegación' },
    { accion: 'irAlPrimero', teclas: 'Home', rotulo: 'Primera línea', grupo: 'Navegación' },
    { accion: 'irAlUltimo', teclas: 'End', rotulo: 'Última línea', grupo: 'Navegación' },
    { accion: 'vaciarTicket', teclas: `${mod}+D`, rotulo: 'Vaciar el ticket', grupo: 'Ticket' },
    { accion: 'cobrar', teclas: 'Enter Enter', rotulo: 'Cobrar (dos veces Enter)', grupo: 'Ticket' },
    { accion: 'nuevoTicket', teclas: `${mod}+N`, rotulo: 'Abrir un ticket nuevo', grupo: 'Ticket' },
    { accion: 'ticketAnterior', teclas: 'ArrowLeft', rotulo: 'Ticket anterior', grupo: 'Ticket' },
    { accion: 'ticketSiguiente', teclas: 'ArrowRight', rotulo: 'Ticket siguiente', grupo: 'Ticket' },
    { accion: 'irAlTicket', teclas: 'Alt+1…5', rotulo: 'Ir al ticket N', grupo: 'Ticket' },
    { accion: 'cambiarMetodoPago', teclas: 'F4', rotulo: 'Cambiar el método de pago', grupo: 'Ticket' },
    { accion: 'enfocarBusqueda', teclas: 'F2', rotulo: 'Buscar', grupo: 'Búsqueda' },
    { accion: 'enfocarCatalogo', teclas: 'F3', rotulo: 'Volver al catálogo', grupo: 'Búsqueda' },
    { accion: 'salirDeBusqueda', teclas: 'Escape', rotulo: 'Salir de la búsqueda', grupo: 'Búsqueda' },
    { accion: 'abrirMarcas', teclas: `${mod}+M`, rotulo: 'Marcas', grupo: 'General' },
   
  ]
}
