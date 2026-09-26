import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, FilterX, Search, ShoppingCart, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '../../lib/cn'
import { CustomSelect } from '../../components/ui/CustomSelect'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { LoadingState } from '../../components/ui/LoadingState'
import { Tooltip } from '../../components/ui/Tooltip'
import { MarcasModal } from '../../components/inventory/MarcasModal'
import { useHotkey } from '../../hooks/useHotkey'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { MOD_IS_META } from '../../lib/hotkeys'
import type { Categoria, Marca, ProductoConLoteActivo } from '../../../electron/db/types'
import { categoriasService } from '../../services/categorias.service'
import { marcasService } from '../../services/marcas.service'
import { productosService } from '../../services/productos.service'
import { Cart } from './Cart'
import { CategoryFilter } from './CategoryFilter'
import { PosTabs } from './PosTabs'
import { ProductGrid } from './ProductGrid'
import { NoVendiblesBadge } from './NoVendiblesBadge'
import {
  actualizarTicketActivo,
  agregarAlTicket,
  agregarTicket,
  cambiarCantidadTicket,
  cambiarMetodoPagoTicket,
  cerrarTicket,
  construirCategorias,
  contarBloqueados,
  crearTicket,
  esVendible,
  filtrarCatalogoPOS,
  formatearMoneda,
  mapearProductosPOS,
  puedeAbrirTicket,
  quitarDelTicket,
  resumirTicket,
  separarPorDisponibilidad,
  ticketActivo,
  aplicarValorVista,
  aplicarVistaCatalogo,
  etiquetaVista,
  valorVistaActiva,
  OPCIONES_VISTA,
  VISTA_POR_DEFECTO,
  type MetodoPagoPOS,
  type ProductoPOS,
  type TicketSession,
  type VistaCatalogo,
} from './posQuery'

/** Modificador de atajos según plataforma: "Ctrl" o "Cmd". */
const MOD_TEXTO = MOD_IS_META ? 'Cmd' : 'Ctrl'
/** Formato W3C para aria-keyshortcuts (ej: "Control+KeyM"). */
const modAtajo = (tecla: string, shift = false) =>
  `${MOD_IS_META ? 'Meta' : 'Control'}${shift ? '+Shift' : ''}+Key${tecla}`

// Corte del modo colapsable. El mismo número va en el `useMediaQuery` de
// `ticketColapsable` y en las variantes `max-[1024px]:` de `NoVendiblesBadge` y
// `ProductGrid`. Tailwind no puede leer esta constante, así que hay que
// acordarse a mano.
const ANCHO_MOBILE = 1024

export function PosPage() {
  const [productosCrudos, setProductosCrudos] = useState<ProductoConLoteActivo[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [marcas, setMarcas] = useState<Marca[]>([])
  const [cargando, setCargando] = useState(true)
  const [errorProductos, setErrorProductos] = useState<string | null>(null)
  const [marcasAbiertas, setMarcasAbiertas] = useState(false)

  const [busqueda, setBusqueda] = useState('')
  const [categoriaId, setCategoriaId] = useState('all')
  const [vista, setVista] = useState<VistaCatalogo>(VISTA_POR_DEFECTO)

  // Cada venta en curso es una sesión con su propio contenido y su propio
  // método de pago. Siempre hay al menos una: `crearTicket` la abre y
  // `cerrarTicket` la reabre si era la última, así que la pantalla de venta
  // nunca queda sin dónde armar la venta siguiente.
  const [tickets, setTickets] = useState<TicketSession[]>(() => [crearTicket('t1', 1)])
  const [activeTicketId, setActiveTicketId] = useState('t1')

  /**
   * Los ids se generan acá y no en `posQuery.ts` a propósito: `crearTicket` es
   * pura y no puede inventar aleatoriedad. Un contador además deja el id legible
   * en los tests y en el devtools, cosa que un `randomUUID` no.
   */
  const contadorTicket = useRef(1)
  const siguienteIdTicket = useCallback(() => `t${++contadorTicket.current}`, [])

  const busquedaDiferida = useDeferredValue(busqueda)

  const marcasActivas = useMemo(() => marcas.filter((m) => m.activo).length, [marcas])

  // Ctrl+M → marcas, igual que en Inventario. Se deshabilita con el modal
  // abierto para no reabrirlo encima del que ya está.
  useHotkey('mod+m', () => setMarcasAbiertas(true), {
    enabled: !marcasAbiertas,
    ignoreInputs: false,
  })

  useEffect(() => {
    let activo = true

    void Promise.all([
      productosService.getAll(),
      categoriasService.getAll(),
      marcasService.getAll(),
    ])
      .then(([productos, categoriasData, marcasData]) => {
        if (!activo) return
        setProductosCrudos(productos)
        setCategorias(categoriasData)
        setMarcas(marcasData)
        setCargando(false)
      })
      .catch((err) => {
        if (!activo) return
        setErrorProductos(
          err instanceof Error ? err.message : 'Error al cargar productos',
        )
        setCargando(false)
      })

    return () => {
      activo = false
    }
  }, [])

  const categoriasPorId = useMemo(
    () => new Map(categorias.map((categoria) => [categoria.id, categoria])),
    [categorias],
  )

  const marcasPorId = useMemo(
    () => new Map(marcas.map((marca) => [marca.id, marca])),
    [marcas],
  )

  const catalogo = useMemo(
    () =>
      mapearProductosPOS(
        productosCrudos.filter((producto) => producto.activo),
        categoriasPorId,
        marcasPorId,
      ),
    [productosCrudos, categoriasPorId, marcasPorId],
  )

  const porBusqueda = useMemo(
    () => filtrarCatalogoPOS(catalogo, busquedaDiferida, 'all'),
    [catalogo, busquedaDiferida],
  )

  const productos = useMemo(
    () =>
      aplicarVistaCatalogo(
        porBusqueda.filter(
          (producto) =>
            categoriaId === 'all' || String(producto.categoriaId) === categoriaId,
        ),
        vista,
      ),
    [porBusqueda, categoriaId, vista],
  )

  const { vendibles, noVendibles } = useMemo(
    () => separarPorDisponibilidad(productos),
    [productos],
  )

  const bloqueo = useMemo(() => contarBloqueados(catalogo), [catalogo])

  const hayFiltrosActivos =
    busqueda.trim() !== '' ||
    categoriaId !== 'all' ||
    vista.filtro !== VISTA_POR_DEFECTO.filtro ||
    vista.orden !== VISTA_POR_DEFECTO.orden

  const vendiblesDeBusqueda = useMemo(
    () => porBusqueda.filter(esVendible),
    [porBusqueda],
  )

  const categoriasCatalogo = useMemo(
    () => construirCategorias(vendiblesDeBusqueda, categorias, categoriaId),
    [vendiblesDeBusqueda, categorias, categoriaId],
  )

  // Todo el carrito se deriva de la sesión activa: el resumen, el total y el
  // contador de ítems nunca miran el arreglo completo, así que es imposible
  // que el total de la pantalla sea el de otra venta.
  const ticket = useMemo(
    () => ticketActivo(tickets, activeTicketId),
    [tickets, activeTicketId],
  )

  const resumen = useMemo(() => resumirTicket(ticket.items), [ticket])

  const ticketColapsable = useMediaQuery(`(max-width: ${ANCHO_MOBILE}px)`)

  // Local a propósito y no en `ui.store`: el `isRightSidebarOpen` de ese store
  // es el drawer de Ajustes del shell, y compartirlo hacía que abrir el ticket
  // abriera también Ajustes.
  const [ticketAbierto, setTicketAbierto] = useState(false)
  const abrirPanelTicket = useCallback(() => setTicketAbierto(true), [])
  const cerrarPanelTicket = useCallback(() => setTicketAbierto(false), [])

  // Al volver a escritorio el drawer deja de existir, así que el estado no puede
  // quedar abierto. Se ajusta en la fase de render y no en un `useEffect` para
  // no provocar el segundo render en cascada que marca `set-state-in-effect`.
  const [mobileAlAbrir, setMobileAlAbrir] = useState(ticketColapsable)
  if (mobileAlAbrir !== ticketColapsable) {
    setMobileAlAbrir(ticketColapsable)
    if (!ticketColapsable) setTicketAbierto(false)
  }

  useEffect(() => {
    if (!ticketColapsable || !ticketAbierto) return
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') cerrarPanelTicket()
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [ticketColapsable, ticketAbierto, cerrarPanelTicket])

  const handleAgregar = useCallback(
    (producto: ProductoPOS) => {
      setTickets((previos) =>
        actualizarTicketActivo(previos, activeTicketId, (items) =>
          agregarAlTicket(items, producto),
        ),
      )
    },
    [activeTicketId],
  )

  const handleCambiarCantidad = useCallback(
    (productoId: number, cantidad: number) => {
      setTickets((previos) =>
        actualizarTicketActivo(previos, activeTicketId, (items) =>
          cambiarCantidadTicket(items, productoId, cantidad),
        ),
      )
    },
    [activeTicketId],
  )

  const handleQuitar = useCallback(
    (productoId: number) => {
      setTickets((previos) =>
        actualizarTicketActivo(previos, activeTicketId, (items) =>
          quitarDelTicket(items, productoId),
        ),
      )
    },
    [activeTicketId],
  )

  // Vaciar es por sesión, no global: vaciar el ticket que se está mirando no
  // puede borrar las otras ventas abiertas.
  const handleVaciar = useCallback(() => {
    setTickets((previos) => actualizarTicketActivo(previos, activeTicketId, () => []))
  }, [activeTicketId])

  const handleCambiarMetodoPago = useCallback(
    (metodo: MetodoPagoPOS) => {
      setTickets((previos) =>
        cambiarMetodoPagoTicket(previos, activeTicketId, metodo),
      )
    },
    [activeTicketId],
  )

  const handleSelectTicket = useCallback((id: string) => {
    setActiveTicketId(id)
  }, [])

  const handleNuevoTicket = useCallback(() => {
    if (!puedeAbrirTicket(tickets)) return
    const id = siguienteIdTicket()
    setTickets((previos) => agregarTicket(previos, id))
    setActiveTicketId(id)
  }, [tickets, siguienteIdTicket])

  const handleCloseTicket = useCallback(
    (id: string) => {
      const resultado = cerrarTicket(tickets, id, activeTicketId, siguienteIdTicket())
      setTickets(resultado.tickets)
      setActiveTicketId(resultado.activeTicketId)
    },
    [tickets, activeTicketId, siguienteIdTicket],
  )

  const handleLimpiarFiltros = useCallback(() => {
    setBusqueda('')
    setCategoriaId('all')
    setVista(VISTA_POR_DEFECTO)
  }, [])

  const handleCobrar = useCallback(() => {
    // Sin este guarda, un cobro sobre un ticket vacío anunciaría una venta que
    // no ocurrió. Hoy el botón llega deshabilitado en ese caso, pero el handler
    // no debería depender de que eso siga siendo cierto.
    if (ticket.items.length === 0) return

    // `cerrarTicket` se calcula por fuera del updater a propósito: meter un
    // `setActiveTicketId` adentro de un `setTickets` es un efecto dentro de un
    // updater, que React puede ejecutar dos veces en StrictMode.
    const resultado = cerrarTicket(tickets, activeTicketId, activeTicketId, siguienteIdTicket())
    setTickets(resultado.tickets)
    setActiveTicketId(resultado.activeTicketId)
    toast.success('Venta completada')
  }, [ticket.items.length, tickets, activeTicketId, siguienteIdTicket])

  // La carga reemplaza la página entera, no solo la grilla: renderizar el
  // buscador y el carrito vacíos mientras se cargan los datos se lee como una
  // app rota en vez de como "cargando". Sin padding propio para que el bloque
  // ocupe toda el área y quede bien centrado.
  if (cargando) {
    return (
      <div className="flex h-full w-full items-center justify-center overflow-hidden">
        <LoadingState title="Cargando punto de venta..." fullPage />
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden pt-4 md:pt-6">
      {/*
        El panel tiene ancho fijo y la grilla se lleva el resto. Con `fr` los
        dos tracks son elásticos y el reparto es proporcional, así que el panel
        se llevó el 60% de su ancho mientras la grilla cedía 32% — al revés de
        lo que tiene que pasar. Un `clamp(vw)` tampoco sirve: para que el panel
        llegue a 600px a 1920 el coeficiente tiene que ser ~32vw, y eso lo hace
        perder 220px al bajar a 1100.

        Las filas del apilado NO pueden llevar `auto`: las dimensiona el
        contenido, así que un ticket largo crece, la fila `1fr` de la grilla
        colapsa a 0 y el ticket la tapa. Mobile tiene UNA sola fila porque el
        ticket es un drawer `fixed`, fuera del flujo.
      */}
      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)] gap-6 min-[1025px]:grid-cols-[minmax(0,1fr)_520px]">
        <section className="relative flex min-w-0 min-h-0 flex-col overflow-hidden">
          <div className="mb-4 flex shrink-0 flex-col gap-3">
            {/* El botón de marcas va en la fila del título, a la derecha, igual
                que en Inventario: el título y la acción que cambia el
                filtro conviven, y el buscador queda abajo como la caja donde
                aterriza la marca elegida. */}
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display font-semibold text-2xl tracking-tight text-slate-900 dark:text-white">
                Vender
              </h2>

              <div className="flex items-center gap-2">
                <Tooltip
                  content={`Abrir marcas · ${MOD_TEXTO}+M`}
                  placement="bottom"
                >
                  <Button
                    variant="outline"
                    onClick={() => setMarcasAbiertas(true)}
                    aria-keyshortcuts={modAtajo('M')}
                    className="whitespace-nowrap rounded-2xl px-2 py-2 text-xs sm:text-sm"
                  >
                    Marcas
                    <span className="select-none rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 sm:text-xs dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-300">
                      {marcasActivas}
                    </span>
                  </Button>
                </Tooltip>

                {/* Placeholder: el pedido fue explícitamente solo el botón, sin
                    cablear la consulta de más vendidos. Va `disabled` a
                    propósito para que no sea un click que no hace nada, con
                    `disabled:opacity-100` para que el fondo se vea entero en
                    lugar de lavado. Fondo verde suave: se distingue del
                    outline blanco de Marcas sin competir con el `Cobrar`, que
                    es el único botón sólido de la pantalla. */}
                <Tooltip content="Próximamente" placement="bottom">
                  <Button
                    variant="ghost"
                    disabled
                    aria-label="Ver los productos más vendidos"
                    className="disabled:opacity-100 whitespace-nowrap rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-2 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-500/20 hover:text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400 dark:hover:bg-emerald-500/25"
                  >
                    <TrendingUp size={15} className="shrink-0" aria-hidden />
                    Más vendidos
                  </Button>
                </Tooltip>
              </div>
            </div>

            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <Input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar por producto, marca, variante o código..."
                aria-label="Buscar producto"
                leftIcon={<Search size={16} />}
                className="h-11"
                wrapperClassName="min-w-[200px] flex-1"
              />

              <CustomSelect
                options={OPCIONES_VISTA}
                value={valorVistaActiva(vista)}
                onChange={(valor) => setVista(aplicarValorVista(vista, String(valor)))}
                displayLabel={etiquetaVista(vista)}
                className="w-50 shrink-0"
                buttonClassName="h-11"
              />

              <Tooltip
                content={hayFiltrosActivos ? 'Limpiar todos los filtros' : undefined}
                placement="top"
              >
                <button
                  type="button"
                  onClick={handleLimpiarFiltros}
                  disabled={!hayFiltrosActivos}
                  aria-label="Limpiar todos los filtros"
                  className={cn(
                    'shrink-0 cursor-pointer rounded-xl p-2 transition-colors duration-150',
                    hayFiltrosActivos
                      ? 'text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400'
                      : 'cursor-not-allowed text-slate-400 opacity-25 dark:text-slate-600',
                  )}
                >
                  <FilterX className="h-5 w-5" />
                </button>
              </Tooltip>
            </div>

            <CategoryFilter
              categorias={categoriasCatalogo}
              total={vendiblesDeBusqueda.length}
              valor={categoriaId}
              onChange={setCategoriaId}
            />
          </div>

          <ProductGrid
            productos={vendibles}
            sinStock={noVendibles}
            onAgregar={handleAgregar}
            error={errorProductos}
            terminoConsulta={busquedaDiferida}
            onLimpiarFiltros={hayFiltrosActivos ? handleLimpiarFiltros : undefined}
          />

          {!errorProductos && <NoVendiblesBadge conteo={bloqueo} />}
        </section>

        {/*
          `PosTabs` y `Cart` son hermanos directos y sin envoltura: las
          pestañas son el borde superior del panel, así que tienen que tocar el
          `Cart` (de ahí el `-mb-px` de cada pestaña).

          `min-h-0` sí o sí: sin él el `flex-1` del `Cart` no baja de su altura
          de contenido y el flexbox le roba espacio a las pestañas.

          En mobile el mismo `<aside>` pasa a ser `fixed`, o sea que sale del
          flujo y la grilla de arriba queda con una sola columna. Cerrado lleva
          `invisible` además de `translate-x-full` porque `translate` solo lo
          mueve de la pantalla pero lo deja enfocable con el teclado. Este
          wrapper no lleva fondo a propósito: las tabs tienen que flotar sobre
          el backdrop, y el `Cart` es el que aporta la superficie.
        */}
        <aside
          className={cn(
            'relative flex min-h-0 flex-col my-1',
            ticketColapsable &&
              cn(
                // El `top` se cuenta desde `<main>`, no desde el viewport: ese
                // elemento tiene `transform-gpu` y `will-change-transform`, y
                // ambas crean un containing block para los descendientes
                // `fixed`. `<main>` ya arranca debajo del header, así que el
                // margen de 8px va directo y no hay que sumar los 72 del header.
                'fixed top-2 right-0 bottom-0 z-40 w-[min(420px,92vw)] shadow-2xl',
                'transition-transform duration-300 ease-out',
                ticketAbierto
                  ? 'translate-x-0'
                  : 'invisible translate-x-full pointer-events-none',
              ),
          )}
        >
          {/* Asa en el borde IZQUIERDO: es el borde que el dedo acaba de cruzar. */}
          {ticketColapsable && ticketAbierto && (
            <button
              type="button"
              onClick={cerrarPanelTicket}
              aria-label="Cerrar el panel del ticket"
              className="absolute top-1/2 left-0 z-10 flex -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white p-2.5 text-slate-500 shadow-lg shadow-slate-900/10 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:bg-secondary dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          )}

          <PosTabs
            tickets={tickets}
            activeTicketId={activeTicketId}
            onSelect={handleSelectTicket}
            onNew={handleNuevoTicket}
            onClose={handleCloseTicket}
          />

          <Cart
            resumen={resumen}
            metodoPago={ticket.metodoPago}
            activeTicketId={ticket.id}
            numeroTicket={ticket.numero}
            onCambiarMetodoPago={handleCambiarMetodoPago}
            onCambiarCantidad={handleCambiarCantidad}
            onQuitar={handleQuitar}
            onVaciar={handleVaciar}
            onCobrar={handleCobrar}
          />
        </aside>
      </div>

      {/* Backdrop: `button` y no `div` porque el click para cerrar tiene que ser
          alcanzable con teclado. Va después de la grilla para no taparle el
          foco al catálogo. */}
      {ticketColapsable && ticketAbierto && (
        <button
          type="button"
          onClick={cerrarPanelTicket}
          aria-label="Cerrar el panel del ticket"
          className="animate-entry-fade fixed inset-0 z-30 cursor-default bg-slate-900/40 backdrop-blur-[2px]"
        />
      )}

      {/* Botón flotante: pill pegado al borde derecho, en la esquina inferior y
          DEBAJO del de no vendibles. Apilar obliga a que el badge suba y a que
          `ProductGrid` reserve `max-[1024px]:pb-32`. */}
      {ticketColapsable && !ticketAbierto && (
        <button
          type="button"
          onClick={abrirPanelTicket}
          aria-label={
            resumen.unidades === 0
              ? `Abrir el ticket ${ticket.numero}, está vacío`
              : `Abrir el ticket ${ticket.numero} con ${resumen.unidades} ${resumen.unidades === 1 ? 'ítem' : 'ítems'} por ${formatearMoneda(resumen.total)}`
          }
          className="animate-stock-fab-in fixed right-0 bottom-4 z-30 flex cursor-pointer items-center gap-2.5 rounded-l-2xl border border-r-0 border-slate-200 bg-white py-3 pr-2.5 pl-3.5 text-left shadow-lg shadow-slate-900/10 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-secondary dark:hover:bg-slate-800"
        >
          <ShoppingCart
            size={18}
            className="shrink-0 text-emerald-500 dark:text-emerald-400"
            aria-hidden="true"
          />

          {/* El número de ticket va primero porque es lo que no se puede deducir
              de los otros dos datos. */}
          <span className="flex flex-col items-start leading-tight">
            <span className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500">
              Ticket {ticket.numero}
            </span>
            <span className="font-display text-sm font-bold tabular-nums text-slate-900 dark:text-white">
              {resumen.unidades === 0
                ? 'Vacío'
                : `${resumen.unidades} ${resumen.unidades === 1 ? 'ítem' : 'ítems'}`}
              {resumen.unidades > 0 && (
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {' · '}
                  {formatearMoneda(resumen.total)}
                </span>
              )}
            </span>
          </span>

          <ChevronLeft
            size={16}
            className="shrink-0 text-slate-400 dark:text-slate-500"
            aria-hidden="true"
          />
        </button>
      )}

      {/* Elegir una marca la escribe en el buscador en vez de setear un filtro
          aparte: `coincideBusquedaPOS` ya matchea por marca, así que un filtro
          dedicado sería un segundo camino a lo mismo y después habría que
          mantenerlos sincronizados.

          `gestion={false}`: el POS es una pantalla de venta, no de
          mantenimiento. Desde el mostrador se consulta una marca, no se dan de
          alta ni se borran. Por eso tampoco hace falta `onChanged`: si el
          modal no puede modificar marcas, el catálogo no puede quedar
          desactualizado. */}
      <MarcasModal
        isOpen={marcasAbiertas}
        onClose={() => setMarcasAbiertas(false)}
        marcas={marcas}
        productos={productosCrudos}
        gestion={false}
        onSelectMarca={(nombre) => {
          setBusqueda(nombre)
          setMarcasAbiertas(false)
        }}
      />
    </div>
  )
}
