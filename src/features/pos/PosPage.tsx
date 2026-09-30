import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  FilterX,
  Loader2,
  Search,
  Ticket,
  TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '../../lib/cn'
import { CustomSelect } from '../../components/ui/CustomSelect'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { LoadingState } from '../../components/ui/LoadingState'
import { EmptyState } from '../../components/ui/EmptyState'
import { Tooltip } from '../../components/ui/Tooltip'
import { MarcasModal, type ConteoMarca } from '../../components/inventory/MarcasModal'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { MOD_IS_META } from '../../lib/hotkeys'
import type { LineaTicket } from './posQuery'
import type {
  Categoria,
  Marca,
  MasVendido,
  ProductoConLoteActivo,
} from '../../../electron/db/types'
import { categoriasService } from '../../services/categorias.service'
import { marcasService } from '../../services/marcas.service'
import { productosService, MAS_VENDIDOS_LIMITE } from '../../services/productos.service'
import { AyudaAtajos } from './AyudaAtajos'
import { Cart } from './Cart'
import { CategoryFilter } from './CategoryFilter'
import { PosTabs } from './PosTabs'
import { ProductGrid } from './ProductGrid'
import { NoVendiblesBadge } from './NoVendiblesBadge'
import { HistorialVentasModal } from './HistorialVentasModal'
import { useAtajosPOS } from './useAtajosPOS'
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner'
import { usePosTicketsStore } from '../../stores/pos-tickets.store'
import { useCajaStore } from '../../stores/caja.store'
import { ventasService } from '../../services/ventas.service'
import {
  siguienteMetodoPago,
  construirCategorias,
  contarBloqueados,
  esVendible,
  esVisibleEnPOS,
  filtrarCatalogoPOS,
  formatearMoneda,
  idsDesactivados as idsDesactivadosDeCatalogo,
  mapearProductosPOS,
  metodoPagoARegistro,
  motivoStockInsuficiente,
  puedeSumarUno,
  resumirTicket,
  separarPorDisponibilidad,
  ticketActivo,
  aplicarValorVista,
  aplicarVistaCatalogo,
  etiquetaVista,
  valorVistaActiva,
  OPCIONES_VISTA,
  VISTA_POR_DEFECTO,
  type ProductoPOS,
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
  const [historialAbierto, setHistorialAbierto] = useState(false)
  const [confirmandoVaciar, setConfirmandoVaciar] = useState(false)

  const [busqueda, setBusqueda] = useState('')
  const [categoriaId, setCategoriaId] = useState('all')
  const [vista, setVista] = useState<VistaCatalogo>(VISTA_POR_DEFECTO)
  const [viendoMasVendidos, setViendoMasVendidos] = useState(false)
  const [masVendidos, setMasVendidos] = useState<MasVendido[]>([])
  const [cargandoMasVendidos, setCargandoMasVendidos] = useState(false)

  // Cada venta en curso es una sesión con su propio contenido y su propio
  // método de pago. Siempre hay al menos una: `crearTicket` la abre y
  // `cerrarTicket` la reabre si era la última, así que la pantalla de venta
  // nunca queda sin dónde armar la venta siguiente.
  const tickets = usePosTicketsStore((estado) => estado.tickets)
  const activeTicketId = usePosTicketsStore((estado) => estado.activeTicketId)
  const rehidratar = usePosTicketsStore((estado) => estado.rehidratar)

  // Sin caja abierta no hay venta: la fila de `ventas` exige `caja_id` y
  // `empleado_id`, y sin esa fila una venta cobrada no se puede imputar a nadie
  // ni contarla en ningún cierre. Por eso el cobro se bloquea, no se "avisa".
  const caja = useCajaStore((estado) => estado.caja)
  const cajaCargada = useCajaStore((estado) => estado.cargado)
  const [cobrando, setCobrando] = useState(false)

  const busquedaDiferida = useDeferredValue(busqueda)

  // Conteo por marca para el selector: el número que el cajero necesita es el de
  // los productos que se pueden cobrar, no el de todos los asignados. Se cuenta
  // sobre los crudos porque ahí está `activo`, que `mapearProductosPOS` ya no
  // mira.
  const conteoPorMarca = useMemo(() => {
    const conteos = new Map<number, ConteoMarca>()

    for (const producto of productosCrudos) {
      if (producto.marcaId === null) continue
      const conteo = conteos.get(producto.marcaId) ?? { vendibles: 0, total: 0 }
      conteo.total += 1
      if (esVisibleEnPOS(producto)) conteo.vendibles += 1
      conteos.set(producto.marcaId, conteo)
    }

    return conteos
  }, [productosCrudos])

  const marcasActivas = useMemo(() => marcas.filter((m) => m.activo).length, [marcas])

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
        // Recién con el catálogo en memoria se pueden reponer los nombres y los
        // precios de las líneas que venían de localStorage.
        rehidratar(productos)
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
  }, [rehidratar])

  const categoriasPorId = useMemo(
    () => new Map(categorias.map((categoria) => [categoria.id, categoria])),
    [categorias],
  )

  const marcasPorId = useMemo(
    () => new Map(marcas.map((marca) => [marca.id, marca])),
    [marcas],
  )

  // Sobre los CRUDOS, no sobre `catalogo`: `catalogo` ya filtró los
  // desactivados, así que no hay forma de saber que una línea ya armada
  // corresponde a un producto que después se desactivó.
  const idsDesactivados = useMemo(
    () => idsDesactivadosDeCatalogo(productosCrudos),
    [productosCrudos],
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

  const stockPorId = useMemo(
    () => new Map(catalogo.map((p) => [p.id, p.stock])),
    [catalogo],
  )
  const porBusqueda = useMemo(
    () => filtrarCatalogoPOS(catalogo, busquedaDiferida, 'all'),
    [catalogo, busquedaDiferida],
  )

  /**
   * El ranking entra DESPUÉS del catálogo, no antes. El renderer ya tiene cada
   * producto mapeado a POS con su estado de stock calculado; el ranking solo
   * necesita decir en qué orden van. Traer los productos otra vez desde la base
   * duplicaría el mapeo y devolvería un producto crudo sin `estado`, que
   * `separarPorDisponibilidad` no sabe clasificar.
   */
  const catalogoRanking = useMemo(() => {
    const porId = new Map(catalogo.map((producto) => [producto.id, producto]))
    const top: ProductoPOS[] = []
    for (const item of masVendidos) {
      // Un top seller desactivado NO entra: `catalogo` ya lo filtró, y el POS no
      // debe ofrecer agregar al ticket un producto desactivado. El ranking se
      // acorta solo, sin hueco: la posición siguiente sube por lo que reste.
      const producto = porId.get(item.productoId)
      if (producto) top.push(producto)
    }
    return top
  }, [catalogo, masVendidos])

  /**
 * Lo que la grilla está mostrando AHORA: el ranking en modo más vendidos, o el
 * catálogo filtrado por búsqueda.
 *
 * Es la única fuente para la grilla y para las pills de categoría. Si las pills
 * se calcularan aparte del conjunto real, en modo ranking seguirían contando
 * productos que no están a la vista: el cajero filtraría por "Bebidas", vería
 * un número que no corresponde con las cards de abajo y no sabría cuál de los
 * dos datos miente.
 */
  const conjuntoGrilla = useMemo(() => {
    if (!viendoMasVendidos) return porBusqueda
    return filtrarCatalogoPOS(catalogoRanking, busquedaDiferida, 'all')
  }, [porBusqueda, catalogoRanking, busquedaDiferida, viendoMasVendidos])

  const productos = useMemo(() => {
    const porCategoria = conjuntoGrilla.filter(
      (producto) => categoriaId === 'all' || String(producto.categoriaId) === categoriaId,
    )
    // El ranking ES el orden. Aplicar `vista.orden` lo pisaría y el cajero vería
    // los más vendidos alfabéticos, que es exactamente lo contrario de lo que
    // pidió al apretar el botón.
    if (viendoMasVendidos) return porCategoria
    return aplicarVistaCatalogo(porCategoria, vista)
  }, [conjuntoGrilla, categoriaId, vista, viendoMasVendidos])

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
    () => conjuntoGrilla.filter(esVendible),
    [conjuntoGrilla],
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

  const {
    agregar: agregarAlTicketActivo,
    cambiarCantidad: cambiarCantidadTicketActivo,
    quitar: quitarDelTicketActivo,
    vaciarActivo,
    cambiarMetodoPago: cambiarMetodoPagoTicketActivo,
    seleccionarTicket,
    nuevoTicket: abrirTicket,
    cerrar: cerrarTicketDelStore,
    moverTicket,
    irAlTicket,
  } = usePosTicketsStore()

  // La lectora se apaga con algo modal en pantalla (agregaría una línea detrás
  // del diálogo) y mientras se guarda una venta: el ticket se está por cerrar.
  const scannerHabilitado =
    !cargando && !confirmandoVaciar && !cobrando && !(ticketColapsable && ticketAbierto)

  const handleAgregar = useCallback(
    (producto: ProductoPOS) => agregarAlTicketActivo(producto),
    [agregarAlTicketActivo],
  )

  // ── Modo "más vendidos" ──
  //
  // El ranking se pide la PRIMERA vez que se aprieta el botón, no en el arranque
  // de la pantalla. Son 24 filas agrupadas sobre `detalle_ventas`, y hoy esa
  // tabla no tiene ningún índice: cargarla siempre le agrega latencia a un POS
  // que ya tarda en pintar. La mayoría de las sesiones de caja nunca aprieta el
  // botón, así que no hay por qué pagar esa consulta de entrada.
  const toggleMasVendidos = useCallback(async () => {
    const activando = !viendoMasVendidos
    setViendoMasVendidos(activando)

    if (!activando) return
    if (masVendidos.length > 0 || cargandoMasVendidos) return

    setCargandoMasVendidos(true)
    try {
      setMasVendidos(await productosService.getMasVendidos(MAS_VENDIDOS_LIMITE))
    } catch (error) {
      // Se sale del modo: dejarlo activo mostrando el catálogo entero silencioso
      // sería indistinguishable de que el botón no funciona.
      setViendoMasVendidos(false)
      toast.error(
        error instanceof Error
          ? `No se pudieron cargar los más vendidos: ${error.message}`
          : 'No se pudieron cargar los más vendidos',
      )
    } finally {
      setCargandoMasVendidos(false)
    }
  }, [viendoMasVendidos, masVendidos.length, cargandoMasVendidos])

  // ── Lectora de código de barras ──
  //
  // Misma resolución que Inventario (`productosService.scan`), pero en vez de
  // filtrar la grilla agrega el producto al ticket activo. El escaneo se
  // consulta a la base y no al catálogo en memoria a propósito: el catálogo solo
  // tiene los productos activos, así que un código de uno desactivado se
  // reportaría como inexistente en vez de como desactivado.
  const agregarPorEscaneo = useCallback(
    async (barcode: string) => {
      const productoCrudo = await productosService.scan(barcode)
      if (!productoCrudo) {
        toast.error(`No existe ningún producto con el código "${barcode}"`)
        return
      }
      if (!productoCrudo.activo) {
        toast.error(
          `El producto "${productoCrudo.nombre}" está desactivado: no se puede agregar al ticket`,
        )
        return
      }

      const [producto] = mapearProductosPOS(
        [productoCrudo],
        categoriasPorId,
        marcasPorId,
      )
      // El store descarta en silencio lo que no es vendible (vencido o sin
      // stock). Acá se avisa antes: escanear y que no pase nada sería el peor
      // resultado posible para el cajero.
      if (!esVendible(producto)) {
        toast.error(
          `"${producto.nombre}" no se puede vender: ${producto.estado === 'vencido' ? 'está vencido' : 'no tiene stock'}`,
        )
        return
      }

      const enTicket = ticket.items.find((i) => i.productoId === producto.id)
      if (enTicket && !puedeSumarUno(enTicket, producto)) {
        toast.error(motivoStockInsuficiente(producto.nombre, producto.stock))
        return
      }

      agregarAlTicketActivo(producto)
    },
    [agregarAlTicketActivo, categoriasPorId, marcasPorId, ticket.items],
  )

  useBarcodeScanner('sales', (barcode) => void agregarPorEscaneo(barcode), scannerHabilitado)

  const handleCambiarCantidad = useCallback(
    (productoId: number, cantidad: number) =>
      cambiarCantidadTicketActivo(productoId, cantidad, idsDesactivados),
    [cambiarCantidadTicketActivo, idsDesactivados],
  )

  const handleQuitar = useCallback(
    (productoId: number) => quitarDelTicketActivo(productoId),
    [quitarDelTicketActivo],
  )

  // Vaciar es por sesión, no global: vaciar el ticket que se está mirando no
  // puede borrar las otras ventas abiertas.
  const handleVaciar = vaciarActivo

  const handleCambiarMetodoPago = cambiarMetodoPagoTicketActivo

  const handleSelectTicket = seleccionarTicket

  const handleNuevoTicket = useCallback(() => {
    abrirTicket()
  }, [abrirTicket])

  const handleCloseTicket = useCallback(
    (id: string) => cerrarTicketDelStore(id),
    [cerrarTicketDelStore],
  )

  const handleLimpiarFiltros = useCallback(() => {
    setBusqueda('')
    setCategoriaId('all')
    setVista(VISTA_POR_DEFECTO)
  }, [])

  // ── Atajos de teclado ──
  //
  // El cursor es un índice sobre `vendibles`, no el foco del DOM: cada card es
  // un `<button>` y si las flechas movieran el foco real, un Enter la activaría
  // de forma nativa y "Enter Enter para cobrar" no se distinguiría de "Enter
  // Enter para agregar dos unidades".
  const busquedaRef = useRef<HTMLInputElement>(null)

  // `+`, `-` y `Delete` reciben la línea seleccionada, así que no buscan el
  // producto: viene del ticket y por definición está en él.
  const handleAumentarUno = useCallback(
    (linea: LineaTicket) => handleCambiarCantidad(linea.productoId, linea.cantidad + 1),
    [handleCambiarCantidad],
  )

  const handleRestarUno = useCallback(
    (linea: LineaTicket) => handleCambiarCantidad(linea.productoId, linea.cantidad - 1),
    [handleCambiarCantidad],
  )

  const handleQuitarLineaSeleccionada = useCallback(
    (linea: LineaTicket) => handleQuitar(linea.productoId),
    [handleQuitar],
  )

  const handleCambiarTicket = moverTicket

  const handleIrAlTicket = irAlTicket

  // El orden importa: sin caja el motivo es la caja aunque el ticket también
  // esté vacío, porque es la causa raíz. La caja manda.
  const motivoCobroBloqueado = !cajaCargada
    ? 'Verificando la caja…'
    : !caja
      ? 'Abrí la caja desde el encabezado para poder cobrar'
      : ticket.items.length === 0
        ? 'Cargá al menos un producto al ticket para cobrar'
        : null

  /**
   * Candado del cobro en un ref y no en el estado: dos Enters en el mismo tick
   * llaman al MISMO closure, que todavía ve `cobrando` en `false` porque React no
   * re-renderizó, y se guardarían dos ventas.
   */
  const cobroEnVuelo = useRef(false)

  const handleCobrar = useCallback(async () => {
    // El handler no confía en que el botón siga deshabilitado para el ticket vacío.
    if (ticket.items.length === 0) return

    // Los guards van acá y no solo en el botón porque `Enter` es un atajo: no
    // pasa por el `onClick` del `Cobrar`.
    if (cobroEnVuelo.current) return

    if (!caja) {
      if (cajaCargada) toast.error('Abrí la caja desde el encabezado para poder cobrar')
      return
    }

    cobroEnVuelo.current = true
    setCobrando(true)
    try {
      // El monto de cada línea es el precio YA MAYOREO: `resumirTicket` calcula
      // el 10% de descuento por cantidad. Mandar `precioVenta` y dejar que la
      // base lo recalcule duplicaría la regla del mayoreo en dos lugares.
      const venta = await ventasService.process({
        cajaId: caja.id,
        empleadoId: caja.empleadoId,
        subtotal: resumen.subtotal,
        descuento: resumen.descuento,
        impuesto: resumen.impuesto,
        total: resumen.total,
        items: resumen.lineas.map((linea) => ({
          productoId: linea.productoId,
          tipoTarifa: linea.tipoTarifa,
          descripcionItem: linea.nombre,
          cantidad: linea.cantidad,
          precioUnitario: linea.precioUnitario,
          costoUnitario: linea.costo,
        })),
        pagos: [{ metodo: metodoPagoARegistro(ticket.metodoPago), monto: resumen.total }],
      })

      cerrarTicketDelStore(activeTicketId)
      toast.success(`Venta #${venta.ventaId} · ${formatearMoneda(resumen.total)}`)

      // Sin releer el catálogo la grilla muestra el stock anterior y el cajero
      // puede volver a agregar un producto que ya no queda.
      try {
        setProductosCrudos(await productosService.getAll())
      } catch {
        // La venta quedó guardada; lo viejo es el stock en pantalla. Avisar el
        // desfase es mejor que dejar vender de nuevo algo que ya no queda.
        toast.warning('La venta se guardó, pero no se pudo actualizar el stock en pantalla')
      }
    } catch (error) {
      // El ticket NO se toca: si la base rechazó la venta hay que poder
      // reintentar sin volver a armarla.
      toast.error(error instanceof Error ? error.message : 'No se pudo registrar la venta')
    } finally {
      cobroEnVuelo.current = false
      setCobrando(false)
    }
  }, [
    ticket.items.length,
    ticket.metodoPago,
    caja,
    cajaCargada,
    resumen,
    activeTicketId,
    cerrarTicketDelStore,
  ])

  const {
    lineaSeleccionada,
    setLineaSeleccionada,
    refLista,
    ayudaAbierta,
    cerrarAyuda,
  } = useAtajosPOS({
    lineas: resumen.lineas,
    busquedaRef,
    onAumentarUno: handleAumentarUno,
    onRestarUno: handleRestarUno,
    onQuitarLinea: handleQuitarLineaSeleccionada,
    onSolicitarVaciar: () => setConfirmandoVaciar(true),
    onCobrar: handleCobrar,
    onNuevoTicket: handleNuevoTicket,
    onCambiarTicket: handleCambiarTicket,
    onIrAlTicket: handleIrAlTicket,
    onAbrirMarcas: () => setMarcasAbiertas(true),
    onCambiarMetodoPago: () =>
      handleCambiarMetodoPago(siguienteMetodoPago(ticket.metodoPago)),
    onSalirDeBusqueda: () => setBusqueda(''),
    onSinEfecto: (mensaje) => toast.warning(mensaje),
  })

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
              <div className="flex min-w-0 items-center gap-2">
                  {/* El título cambia porque el cajero tiene que saber si está
                      mirando el catálogo entero o el ranking. El botón vuelve a
                      ser el camino de salida, y no solo apagar el highlight del
                      botón de más vendidos: el catálogo completo tiene que
                      quedar siempre a un clic de vuelta. */}
                  {viendoMasVendidos && (
                    <Tooltip content="Volver a todo el catálogo" placement="bottom">
                      <Button
                        variant="ghost"
                        onClick={() => void toggleMasVendidos()}
                        aria-label="Volver a todo el catálogo"
                        className="h-9 w-9 shrink-0 rounded-xl p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white"
                      >
                        <ArrowLeft size={18} className="shrink-0" aria-hidden />
                      </Button>
                    </Tooltip>
                  )}

                  <h2 className="truncate font-display font-semibold text-2xl tracking-tight text-slate-900 dark:text-white">
                    {viendoMasVendidos ? 'Más vendidos' : 'Vender'}
                  </h2>
                </div>

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

                {/* Modo "más vendidos": cambia lo que muestra la grilla, no el orden de la
                    grilla entera.
                    `ghost` trae sus propios slate y se pisan con los de acá vía
                    `cn`, pero igual se declaran los dos estados completos
                    (reposo y hover) con su par claro/oscuro: dejar el hover solo
                    en claro hacía que en oscuro el botón se apagara al pasar el
                    mouse y pareciera deshabilitado.
                    Fondo verde suave para distinguirse del outline de Marcas sin
                    competir con el `Cobrar`, que es el único botón sólido de la
                    pantalla. Activo se llena y suma un check, porque el estado
                    vive acá y no se deduce del color. */}
                <Tooltip
                  content={
                    viendoMasVendidos
                      ? 'Volver a todo el catálogo'
                      : 'Ver los productos más vendidos'
                  }
                  placement="bottom"
                >
                  <Button
                    variant="ghost"
                    onClick={() => void toggleMasVendidos()}
                    aria-pressed={viendoMasVendidos}
                    aria-label="Ver los productos más vendidos"
                    aria-busy={cargandoMasVendidos}
                    className={cn(
                      'whitespace-nowrap rounded-2xl border text-sm font-semibold',
                      viendoMasVendidos
                        ? 'border-emerald-500 bg-emerald-500/25 text-emerald-800 hover:bg-emerald-500/30 hover:text-emerald-900 dark:border-emerald-500/60 dark:bg-emerald-500/25 dark:text-emerald-200 dark:hover:bg-emerald-500/35 dark:hover:text-white'
                        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 hover:text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-400 dark:hover:bg-emerald-500/25 dark:hover:text-emerald-200',
                    )}
                  >
                    {cargandoMasVendidos ? (
                      <Loader2 size={15} className="shrink-0 animate-spin" aria-hidden />
                    ) : viendoMasVendidos ? (
                      <Check size={15} className="shrink-0" aria-hidden />
                    ) : (
                      <TrendingUp size={15} className="shrink-0" aria-hidden />
                    )}
                    Más vendidos
                  </Button>
                </Tooltip>
              </div>
            </div>

            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <Input
                ref={busquedaRef}
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar por producto, marca, variante o código..."
                aria-label="Buscar producto"
                leftIcon={<Search size={16} />}
                className="h-11"
                wrapperClassName="min-w-[200px] flex-1"
              />

              {/* En modo más vendidos el selector se OCULTA, no se deshabilita. Mostrar un
                orden activo que no va a pasar nada es peor que no mostrarlo: el
                cajero lo lee como el criterio real de la grilla. El filtro de
                avisos tampoco se arrastra al ranking (`conjuntoGrilla` entra con
                'all'); queda guardado para cuando vuelva al catálogo. */}
              {!viendoMasVendidos && (
                <CustomSelect
                  options={OPCIONES_VISTA}
                  value={valorVistaActiva(vista)}
                  onChange={(valor) =>
                    setVista(aplicarValorVista(vista, String(valor)))
                  }
                  displayLabel={etiquetaVista(vista)}
                  className="w-50 shrink-0"
                  buttonClassName="h-11"
                />
              )}

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

          {/* Sin historial no hay ranking que mostrar, y el mensaje de
              `ProductGrid` ("no hay productos que coincidan con la búsqueda")
              sería falso: no se buscó nada. El modo solo nace después de la
              primera venta. */}
          {viendoMasVendidos && !cargandoMasVendidos && masVendidos.length === 0 ? (
            <div className="flex w-full min-h-0 flex-1 flex-col justify-center">
              <EmptyState
                icon={
                  <TrendingUp
                    className="h-12 w-12 stroke-[1.5] text-emerald-500"
                  />
                }
                title="Todavía no hay ventas"
                description="Los más vendidos se arma con las ventas que ya hiciste. Registrá la primera y la lista se arma sola."
              />
            </div>
          ) : (
            <ProductGrid
              productos={vendibles}
              sinStock={noVendibles}
              onAgregar={handleAgregar}
              error={errorProductos}
              terminoConsulta={busquedaDiferida}
              onLimpiarFiltros={
                hayFiltrosActivos ? handleLimpiarFiltros : undefined
              }
            />
          )}

          {/* El badge cuenta el bloqueo del catálogo COMPLETO, no del ranking:
              en modo más vendidos un producto sin stock puede no estar en la
              grilla, pero sigue pesando en el total que ve el cajero. */}
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
            lineaSeleccionada={lineaSeleccionada}
            onSeleccionarLinea={setLineaSeleccionada}
            refLista={refLista}
            onCambiarMetodoPago={handleCambiarMetodoPago}
            onCambiarCantidad={handleCambiarCantidad}
            onQuitar={handleQuitar}
            onVaciar={handleVaciar}
            idsDesactivados={idsDesactivados}
            stockPorId={stockPorId}
            confirmandoVaciar={confirmandoVaciar}
            onSolicitarVaciar={() => setConfirmandoVaciar(true)}
            onCancelarVaciar={() => setConfirmandoVaciar(false)}
            onAbrirHistorial={() => setHistorialAbierto(true)}
            onCobrar={handleCobrar}
            motivoCobroBloqueado={motivoCobroBloqueado}
            cobrando={cobrando}
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
          {/* `Ticket` y no `ShoppingCart`: el carrito es el ícono del botón
              Cobrar del panel, y este no cobra — abre la venta en curso. El
              ícono tiene que nombrar la acción, no el dominio. */}
          <Ticket
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
      <AyudaAtajos isOpen={ayudaAbierta} onClose={cerrarAyuda} />

      <MarcasModal
        isOpen={marcasAbiertas}
        onClose={() => setMarcasAbiertas(false)}
        marcas={marcas}
        productos={productosCrudos}
        conteoPOS={conteoPorMarca}
        gestion={false}
        onSelectMarca={(nombre) => {
          setBusqueda(nombre)
          setMarcasAbiertas(false)
        }}
      />

      <HistorialVentasModal
        isOpen={historialAbierto}
        onClose={() => setHistorialAbierto(false)}
      />
    </div>
  )
}
