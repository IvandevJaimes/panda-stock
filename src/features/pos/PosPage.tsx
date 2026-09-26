import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { FilterX, Search } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '../../lib/cn'
import { CustomSelect } from '../../components/ui/CustomSelect'
import { Input } from '../../components/ui/Input'
import { LoadingState } from '../../components/ui/LoadingState'
import { Tooltip } from '../../components/ui/Tooltip'
import type { Categoria, Marca, ProductoConLoteActivo } from '../../../electron/db/types'
import { categoriasService } from '../../services/categorias.service'
import { marcasService } from '../../services/marcas.service'
import { productosService } from '../../services/productos.service'
import { Cart } from './Cart'
import { CategoryFilter } from './CategoryFilter'
import { ProductGrid } from './ProductGrid'
import { NoVendiblesBadge } from './NoVendiblesBadge'
import {
  agregarAlTicket,
  cambiarCantidadTicket,
  construirCategorias,
  contarBloqueados,
  esVendible,
  filtrarCatalogoPOS,
  mapearProductosPOS,
  quitarDelTicket,
  resumirTicket,
  separarPorDisponibilidad,
  aplicarValorVista,
  aplicarVistaCatalogo,
  etiquetaVista,
  valorVistaActiva,
  OPCIONES_VISTA,
  VISTA_POR_DEFECTO,
  type ItemTicket,
  type MetodoPagoPOS,
  type ProductoPOS,
  type VistaCatalogo,
} from './posQuery'

export function PosPage() {
  const [productosCrudos, setProductosCrudos] = useState<ProductoConLoteActivo[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [marcas, setMarcas] = useState<Marca[]>([])
  const [cargando, setCargando] = useState(true)
  const [errorProductos, setErrorProductos] = useState<string | null>(null)

  const [busqueda, setBusqueda] = useState('')
  const [categoriaId, setCategoriaId] = useState('all')
  const [vista, setVista] = useState<VistaCatalogo>(VISTA_POR_DEFECTO)
  const [items, setItems] = useState<ItemTicket[]>([])
  const [metodoPago, setMetodoPago] = useState<MetodoPagoPOS>('efectivo')

  const busquedaDiferida = useDeferredValue(busqueda)

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

  const resumen = useMemo(() => resumirTicket(items), [items])

  const handleAgregar = useCallback((producto: ProductoPOS) => {
    setItems((previos) => agregarAlTicket(previos, producto))
  }, [])

  const handleCambiarCantidad = useCallback((productoId: number, cantidad: number) => {
    setItems((previos) => cambiarCantidadTicket(previos, productoId, cantidad))
  }, [])

  const handleQuitar = useCallback((productoId: number) => {
    setItems((previos) => quitarDelTicket(previos, productoId))
  }, [])

  const handleVaciar = useCallback(() => {
    setItems([])
  }, [])

  const handleLimpiarFiltros = useCallback(() => {
    setBusqueda('')
    setCategoriaId('all')
    setVista(VISTA_POR_DEFECTO)
  }, [])

  const handleCobrar = useCallback(() => {
    toast.info('El cobro todavía no está conectado: la venta no se registra')
  }, [])

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
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,2.1fr)_minmax(330px,1fr)] grid-rows-[minmax(0,1fr)] gap-6 max-[1100px]:grid-cols-1 max-[1100px]:grid-rows-[minmax(0,1fr)_auto]">
        <section className="relative flex min-w-0 min-h-0 flex-col">
          <div className="mb-4 flex shrink-0 flex-col gap-3">
            <div>
              <h2 className="font-display font-semibold text-2xl tracking-tight text-slate-900 dark:text-white">
                Vender
              </h2>
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

        <Cart
          resumen={resumen}
          metodoPago={metodoPago}
          onCambiarMetodoPago={setMetodoPago}
          onCambiarCantidad={handleCambiarCantidad}
          onQuitar={handleQuitar}
          onVaciar={handleVaciar}
          onCobrar={handleCobrar}
        />
      </div>
    </div>
  )
}
