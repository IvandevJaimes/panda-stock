import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { FilterX, Search, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '../../lib/cn'
import { CustomSelect } from '../../components/ui/CustomSelect'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { LoadingState } from '../../components/ui/LoadingState'
import { Tooltip } from '../../components/ui/Tooltip'
import { MarcasModal } from '../../components/inventory/MarcasModal'
import { useHotkey } from '../../hooks/useHotkey'
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
        La grilla de catálogo y el panel de ticket NO se reparten por `fr`.

        Con `2.1fr` / `1fr` los dos tracks son elásticos y el reparto del ancho
        disponible es proporcional: en una ventana de 1920 el panel quedaba
        usando ~835px y al bajar de 1100 colapsaba contra su piso de 330px. Eso
        es un problema: el panel se llevaba el 60% de su propio ancho mientras la
        grilla solo cedía 32%, y al revés de lo que tiene que pasar. La grilla de
        cards tiene muchas más chances de seguir siendo legible en 200px que el
        panel de ticket en 330, así que el que tiene que absorber el achicado es
        el catálogo.

        Por eso el panel NO compite por `fr`: la grilla se lleva `1fr` y el panel
        tiene ancho fijo. Un `clamp()` con `vw` no sirve para "que casi no se
        mueva": la función pasa por el origen, así que para que el panel llegue a
        600px en una ventana de 1920 el coeficiente tiene que ser ~32vw, y eso
        lo hace perder 220px de ancho al bajar a 1100. Con un coeficiente chico el
        techo es inalcanzable en cualquier pantalla normal y el `clamp` termina
        siendo un piso fijo con sintaxis de más. Si el panel tiene que estar
        estable, se declara fijo.

        520px es el compromiso: más que los 400px que dejaba las 5 pestañas
        scollear de más, y menos que los ~590px que necesitan para entrar sin
        scroll. La grilla queda con 1296px a 1920 (5 cards de 259px) y con 557px a
        1100 (4 cards de 139px): el panel no se achica nunca y el 100% del
        achicado lo paga el catálogo, que es lo pedido.
      */}
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_520px] grid-rows-[minmax(0,1fr)] gap-6 max-[1100px]:grid-cols-1 max-[1100px]:grid-rows-[minmax(0,1fr)_auto]">
        <section className="relative flex min-w-0 min-h-0 flex-col">
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

            {/* La columna derecha es una sola cosa: el `sticky` y el reparto de
                alto viven acá, y el `Cart` solo ocupa lo que queda debajo de
                las pestañas. Si el `sticky` se quedara en el `Cart`, el panel
                se iría al scrollear y dejaría las pestañas pegadas arriba. */}
        <div className="sticky top-4 flex min-h-0 flex-col">
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
        </div>
      </div>

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
