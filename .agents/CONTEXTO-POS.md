# CONTEXTO — Módulo POS (Punto de Venta) · panda-stock

> Documento de traspaso. Describí el estado real del módulo POS verificado contra
> el código. Sirve para retomar el trabajo con otro agente sin explorar el repo.

## 1. Qué es esto

App de escritorio de gestión comercial. Este documento describe el módulo POS
(ruta `/pos`): catálogo de productos, búsqueda, filtros, ticket de venta local y
preparación del cobro. **El cobro todavía no está conectado a la base de datos.**

## 2. Stack y reglas del repo (obligatorias)

- **Electron 44 + React 19 + TypeScript + Vite 8 + Tailwind 4 + pnpm.**
- Proceso **main** (`electron/main.ts`): único lugar con Node, `better-sqlite3`
  y `drizzle-orm`.
- Proceso **render** (`src/`): **jamás** importar `fs`, `path`, `crypto`,
  `better-sqlite3`. Todo acceso a datos pasa por `src/services/*.service.ts`,
  que hablan con el main vía `window.electronAPI` (preload + `contextBridge`).
- **Tailwind únicamente.** Prohibido crear `.css`, `.module.css` ni `<style>`.
  El único CSS permitido es `src/index.css` y las animaciones globales ya
  existentes en `src/globals.css`.
- Iconos **solo** `lucide-react`. Notificaciones **solo** `sonner`.
- Formularios: `react-hook-form` + `zod`.
- Clases condicionales: siempre con `cn()` (`clsx` + `tailwind-merge`).
- **Comandos con `pnpm`, nunca `npm` ni `yarn`.**
- TypeScript estricto, **sin `any`** salvo en contratos IPC nativos.
- **Dark mode obligatorio** en todo componente (`dark:*`).
- Commits: **Conventional Commits en español** (`feat:`, `fix:`, `refactor:`,
  `style:`, `chore:`, `docs:`), con prefijo de scope: `feat(pos): ...`.
- **Nunca commitear en `main` ni `dev`.** Ramas `feat/*`, `fix/*`, `refactor/*`,
  `chore/*` desprendidas de `dev`. **Nunca borrar ramas** (locales ni remotas).
- Tokens: primario emerald `#10b981`, secundario slate oscuro `#1e2733`.
  Fuentes: `Nunito Sans` cuerpo, `Rubik` display (`font-display`).

## 3. Archivos del módulo

```
src/features/pos/
  PosPage.tsx            Orquestador de estado + layout
  posQuery.ts            Lógica pura: tipos, reglas, búsqueda, vistas, ticket
  posQuery.test.ts       Tests de la lógica pura
  PosPage.test.tsx       Tests de integración de la página
  ProductGrid.tsx        Grilla + EmptyState (error / sin stock / sin coincidencias)
  PosProductCard.tsx     Card del producto
  CategoryFilter.tsx     Carrusel de categorías (envuelve `Pill`)
  NoVendiblesBadge.tsx   Badge flotante de productos bloqueados
  StockStatusBadge.tsx   Badge de estado de stock en la card
  Cart.tsx               Panel del ticket
  CartItem.tsx           Fila del ticket
  Cart.test.tsx          Tests del ticket
  PaymentMethodSelector.tsx  Selector de método de pago
  index.ts               Re-export (`export { PosPage } from './PosPage'`)
```

Ruta: `src/app/router.tsx` → `{ path: '/pos', element: <PosPage /> }`

## 4. Arquitectura y flujo de datos

Regla del módulo: **toda lógica de negocio es función pura y exportada desde
`posQuery.ts`**. Los componentes solo orquestan estado y render. `posQuery.ts` no
importa React, solo tipos.

```
montaje
  └─ useEffect → Promise.all([productosService.getAll(),
                              categoriasService.getAll(),
                              marcasService.getAll()])
       └─ setProductosCrudos / setCategorias / setMarcas

derivación (useMemo, en este orden)
  categoriasPorId, marcasPorId            Map O(1)
  └─ catalogo        = mapearProductosPOS(productosCrudos.filter(activo), ...)
  └─ porBusqueda     = filtrarCatalogoPOS(catalogo, busquedaDiferida, 'all')
  └─ productos       = aplicarVistaCatalogo(porBusqueda.filter(categoria), vista)
  └─ { vendibles, noVendibles } = separarPorDisponibilidad(productos)
  └─ bloqueo         = contarBloqueados(catalogo)      ← catálogo completo, no filtrado
  └─ vendiblesDeBusqueda = porBusqueda.filter(esVendible)
  └- categoriasCatalogo  = construirCategorias(vendiblesDeBusqueda, categorias, categoriaId)
  └─ resumen         = resumirTicket(items)
```

`busquedaDiferida = useDeferredValue(busqueda)` — el typing nunca bloquea.

**Detalle importante:** `filtrarCatalogoPOS` se llama con `'all'` como
categoría y el filtro de categoría se aplica **después**, en `productos`. Motivo:
las categorías con conteo se recalculan sobre `porBusqueda`, o sea ignoran el
propio filtro de categoría (si no, al elegir una categoría el resto quedaría en 0).

## 5. Modelo de dominio

```ts
type EstadoStock = 'disponible' | 'bajo' | 'agotado' | 'vencido'

type ProductoPOS = {
  id, nombre, precio, costo, stock, stockMinimo
  categoriaId: number | null, categoria: string
  marcaId: number | null, marca: string
  variante: string | null
  estado: EstadoStock
  creadoEn: string          // ISO del alta
  diasParaVencer: number | null
  fechaVencimiento: string | null
  imgPath: string | null
  // Campos pre-normalizados para búsqueda:
  _nombreN, _marcaN, _varianteN, _codigoInternoN: string
  _codigosBarras: string[]
}
```

Los campos `_` son derivados en `mapearProductosPOS` y existen para no
re-normalizar en cada keystroke.

```ts
type ItemTicket  = { productoId, nombre, precioVenta, costo, cantidad, imgPath }
type LineaTicket = ItemTicket & {
  tipoTarifa: TipoTarifa, precioUnitario, importeMinorista, ahorro, importe
}
type ResumenTicket = {
  lineas, unidades, subtotal, descuento, impuesto, total
}
type MetodoPagoPOS = 'efectivo' | 'transferencia' | 'tarjeta'
```

## 6. Reglas de negocio

### Mayoreo (derivado, no columnado)

```ts
const UMBRAL_MAYOREO = 3
const FACTOR_MAYOREO = 0.9
```

- `tipoTarifaPorCantidad(cantidad)`: `cantidad >= 3 ? 'mayoreo' : 'minorista'`.
- `precioUnitarioPorCantidad(precioVenta, cantidad)`: mayoreo →
  `redondearMoneda(precioVenta * 0.9)`, minorista → `redondearMoneda(precioVenta)`.
- **No existe columna `precio_mayoreo`** (fue eliminada). El descuento se
  calcula al vender.
- El precio unitario se congela en la línea del ticket al agregar.

### Vencimiento

```ts
const DIAS_POR_VENCER = 14   // mismo umbral que el default de evaluateExpiry
```

- `esVencido(vencimiento)` parsea **dd/mm/aaaa** (formato de la app, no ISO).
- Viene del **lote activo** (`loteActivoVencimiento`), no del producto.
- `derivarEstadoStock` → `agotado` si `stock === 0`; `vencido` si
  `esVencido`; `bajo` si `stock <= stockMinimo`; si no `disponible`.
  **Prioridad: agotado antes que vencido.**

### Vendibilidad

- `esVendible(producto)`: `estado !== 'agotado' && estado !== 'vencido'`.
- `agregarAlTicket` **descarta** el producto si no es vendible.
- La grilla separa en dos: `vendibles` (cards accionables) y `noVendibles`
  (cards sin botón agregar). El conteo va en `NoVendiblesBadge` (flotante).

### Códigos de barra (regla dura del proyecto)

- NO hay tabla de variantes por tono.
- `productos.codigo_interno` = código corto de mostrador (`"111"`).
- `productos.codigos_barras` = **CSV en un solo string** (`"779001,779002"`),
  separado con `separarCodigos` / `limpiarBarras` de
  `src/lib/codigosBarras.ts`.
- La búsqueda hace coincidencia **exacta** contra cada código, o coincidencia
  **por delimitadores** en texto, para descontar del stock general.

### Inventario siempre activo

- Todo artículo maneja `stock_actual` y `stock_minimo`.
- **No agregar** flags `usa_inventario` ni campos `stock_maximo`.
- `lotes.costo_unitario` es histórico e inmutable; el precio de venta vive en
  `productos.precio_venta`.

## 7. Búsqueda

`coincideBusquedaPOS(producto, terminoNormalizado)` — OR de cinco condiciones:

```ts
producto._nombreN.includes(termino)
producto._marcaN.includes(termino)
producto._varianteN.includes(termino)
producto._codigoInternoN === termino        // exacto
producto._codigosBarras.includes(termino)  // exacto contra cada código
```

- `normalizar()` se importa de **`../inventory/inventoryQuery`** (acoplamiento
  real: el POS depende de ese helper puro).
- Es `includes`, no igualdad: buscar "Coca" matchea "Coca Cola".
- Resaltado en la card con `HighlightMatch` (accent-insensitive) +
  `TruncatedText`.
- Placeholder actual: `Buscar por producto, marca, variante o código...`

## 8. Vistas del catálogo (lo más delicado del módulo)

**Un solo `CustomSelect` maneja DOS dimensiones ortogonales:**

```ts
type OrdenCatalogo = 'nuevos' | 'antiguos' | 'alfabetico'
                   | 'alfabetico_desc' | 'precio_asc' | 'precio_desc'
type FiltroAviso   = 'all' | 'bajo' | 'por_vencer' | 'con_avisos'
type VistaCatalogo = { orden: OrdenCatalogo; filtro: FiltroAviso }
VISTA_POR_DEFECTO = { orden: 'nuevos', filtro: 'all' }
```

- Elegir un **orden** NO borra el **filtro** actual, y viceversa.
- Por eso el valor del select va **prefijado** (`orden:nuevos`, `filtro:bajo`) y
  se parsea con `aplicarValorVista` para saber cuál dimensión tocar.
- `OPCIONES_VISTA` = 6 órdenes + 3 filtros (se excluye `all` porque ya es el
  estado inicial) = **9 opciones**.
- `valorVistaActiva(vista)` devuelve el valor prefijado del botón.
- `etiquetaVista(vista)` devuelve el texto visible, que se pasa a
  `CustomSelect` con la prop **`displayLabel`** (necesaria porque el botón
  muestra la etiqueta, no el valor crudo).
- El grupo de órdenes es **simétrico**: cada criterio tiene su inverso.

## 9. Ticket

- Estado **local al POS** (`useState<ItemTicket[]>`), no persistido.
- **Apilado:** `agregarAlTicket` inserta la línea nueva al **frente** del array.
- Incrementar cantidad **no reordena**: si ya existe, solo sube `cantidad` en
  su posición.
- `cambiarCantidadTicket(items, id, cantidad)`: si `cantidad <= 0` **elimina la
  línea**. Por eso en la UI `QuantityStepper` recibe `onRemove` para restar
  desde 1 = quitar.
- `resumirTicket(items)` calcula líneas, subtotal, descuento, impuesto (siempre
  0) y total.

### Layout del ticket (`Cart.tsx`) — doble capa

`aside` es `flex flex-col` con `overflow-hidden`. El **único hijo scrolleable**
es la zona de items:

```
min-h-0 flex-1 overflow-y-auto overscroll-contain
```

`min-h-0` es **obligatorio**: sin él, el `flex-1` no baja de su altura de
contenido y el flexbox le roba espacio a las secciones de abajo en vez de dejar
que esta se desplace. Todas las secciones header / resumen / pagos / botones
llevan `shrink-0`.

El resumen lleva `border-t` + `shadow-[0_-4px_6px_-4px_...]` para que se lea
como "esto scrollea por debajo". La sombra se **apaga en dark mode**: un rgba
negro sobre fondo negro no se ve, y el peso visual lo aporta el borde.

### Vaciado confirmado

Botón Vaciar con hover rojo (`hover:border-red-300 hover:bg-red-500/10
hover:text-red-600`) y `ConfirmModal` antes de vaciar: tirar trabajo de armado
sin confirmar es pérdida de venta irrecuperable.

- `ConfirmModal` con título "Vaciar ticket".
- Descripción: "Se van a quitar todos los productos del ticket. No se puede deshacer."
- `confirmText="Vaciar"`, y `onVaciar()` se llama **solo** al confirmar.
- El botón queda `disabled` si el ticket está vacío.

## 10. Composición de `PosPage`

```
div.flex.flex-col.h-full.overflow-hidden.pt-4
  └─ grid [minmax(0,2.1fr)_minmax(330px,1fr)] gap-6   (responsive a 1 col)
       ├─ section (catálogo, flex-col, min-h-0)
       │    ├─ fila título:  h2 "Vender"  +  [Marcas] [Más vendidos]
       │    ├─ fila búsqueda: Input + CustomSelect(vistas) + botón limpiar
       │    ├─ CategoryFilter (carrusel de categorías)
       │    ├─ ProductGrid
       │    └─ NoVendiblesBadge (flotante, absolute)
       └─ Cart (sticky top-4)
  └─ MarcasModal (portal, gestion={false})
```

- El **loading reemplaza la página entera** con early return + `LoadingState
  fullPage`, no solo la grilla. Sin padding propio para que quede centrado.
- Botón **Cobrar**: `Button variant="primary"` — sólido, icono + texto en
  blanco. **Un degradado competía con el verde del catálogo**; la acción
  principal de la pantalla tiene que leerse como una sola señal.
- **Marcas**: abre `MarcasModal` con `gestion={false}`. Elegir una marca
  **escribe en el buscador** (`setBusqueda(nombre)`) en vez de setear un filtro
  paralelo, porque `coincideBusquedaPOS` ya matchea por marca. Un filtro
  dedicado sería un segundo camino a lo mismo.
- **Más vendidos**: placeholder. Botón presente, `disabled` con
  `disabled:opacity-100` (fondo verde suave visible) y tooltip "Próximamente".
  **No tiene functionality.**

### EmptyState de catálogo sin stock

Cuando la búsqueda arroja solo productos sin stock (`ProductGrid`):
- Título: `Sin stock`
- Mensaje: `Los productos de esta marca no están disponibles para vender.`
- Botón inferior `Limpiar filtros` cuando `onLimpiarFiltros` existe.
- No menciona nombres de productos.

Nota: el copy dice "esta marca" aunque `ProductGrid` también puede aparecer
tras una búsqueda de texto libre. Fue pedido así; si se quiere condicionar,
requiere pasar el contexto de la búsqueda al grid.

## 11. Primitivas de `src/components/ui/` que usa

| Componente | Uso |
|---|---|
| `Button` | Cobrar, Vaciar, Marcas, Más vendidos |
| `Input` | Buscador (con `leftIcon`, `wrapperClassName`) |
| `CustomSelect` | Select de vistas, con `displayLabel` |
| `Tooltip` | Acciones con texto explicativo |
| `LoadingState` | Loading de página completa |
| `Pill` | Chips de categoría |
| `IconButton` | Acciones de icono (`−`, `+`, `✕`) |
| `QuantityStepper` | El grupo `− n +` del ticket |
| `EmptyState` | Error / sin stock / sin coincidencias |
| `ConfirmModal` | Confirmación de Vaciar |

`MarcasModal` vive en **`src/components/inventory/`** (no en `features/`) porque
la consumen dos features. Fue movida con `git mv` para preservar historial.

## 12. Atajos de teclado y escáner

Se usan `useHotkey` (`src/hooks/useHotkey.ts`) + helpers puros de
`src/lib/hotkeys.ts`.

- **`mod+m`** → abrir marcas. `mod` se traduce a `Cmd` en macOS, `Ctrl` en el
  resto. Se deshabilita con el modal abierto (`enabled: !marcasAbiertas`) para no
  reabrirlo encima.
- El botón declara `aria-keyshortcuts` en formato W3C (`Control+KeyM`) vía
  `modAtajo('M')`.

**Pendiente: el escáner en el POS.** Existe `src/hooks/useBarcodeScanner.ts` y
el store `src/stores/scanner.store.ts` ya declara el contexto **`'sales'`**
(`BarcodeScannerContext` incluye además `'inventory'`, `'product-form'`,
`'edit-code-form'`, `'edit-product-form'`, `'inventory-action'`,
`'inventory-inactivos'`), pero **el POS todavía NO lo usa**. Inventario sí lo
usa en 6 lugares.

```ts
useBarcodeScanner(context, (barcode) => { /* barcode ya sanitizado */ }, enabled?)
```

## 13. Gotchas no obvios (leer antes de tocar nada)

1. **`div role="button"` + `<button>` anidado es doble error.** El div
   reinventa teclado/foco a mano, y un `<button>` dentro de otro `<button>` es
   **HTML inválido que rompe la activación por teclado** en varios navegadores.
   Patrón correcto: contenedor neutro + `<button>` real con `aria-pressed` +
   acciones como **hermanas**. Ya se aplicó en `Pill` y en la card de
   `MarcasModal`. El `stopPropagation` que tenían era el parche del error
   estructural: si no hay anidamiento, sobra.

2. **Tooltip corto vs `aria-label` autocontenido, a propósito.** El tooltip se
   lee mirando la fila, donde ya se sabe qué producto es → "Agregar 1" alcanza.
   El `aria-label` lo lee un lector de pantalla saltando entre controles →
   necesita el nombre del producto para no ser ambiguo. No son canales que
   deban copiar al otro.

3. **`peer-hover:` no funciona con un input `sr-only`.** El selector hermano
   necesita un elemento hermano real; un input visualmente oculto por
   `sr-only` sigue siendo hermano, pero el hover nunca lo "alcanza" de forma
   útil. Por eso `PaymentMethodSelector` usa **`group`** sobre el `<label>`.

4. **`onAnimationEnd` no sirve si se respeta `prefers-reduced-motion`.** Con
   `animation: none !important` el evento nunca se dispara y el nodo queda
   colgado. Por eso `CartItem` usa un `setTimeout` de **180ms** (que tiene que
   matchear `.animate-exit-up` en `globals.css`) y limpia el timer al desmontar.

5. **`bg-gradient-*` + `bg-clip-text` requiere texto transparente.** El Total
   del ticket usa `bg-clip-text text-emerald-700 dark:text-transparent`. Si
   ponés un color de texto opaco, se pinta el fondo y no el glifo: el degradado
   no se ve.

6. **jsdom no implementa `scrollIntoView`.** Hay un shim global en
   `src/test/setup.ts` porque `Pill` lo usa en `onMouseEnter`.

7. **`@tippyjs/react` preserva el ref del hijo** (`preserveRef(children.ref, node)`
   en su dist), así que envolver un `forwardRef` en `Tooltip` no rompe el ref.
   Pero `IconButton` envuelve el tooltip en un `<span>` por otra razón:
   el `overflow-hidden` del contenedor redondeado **recorta** el anillo de
   `focus-visible`, que se dibuja fuera de la caja del botón.

8. **`creadoEn` se ordena como string.** Se asume formato ISO, que ordena
   lexicográficamente igual que cronológicamente.

9. **Cuidado con el conteo de instancias de Tippy.** Un carrito de 40 items × 3
   tooltips = 120 instancias creadas al montar, aunque no se vean. Medido:
   **6.99s con tooltips vs 5.06s sin ellos**. Por eso el test de 40 items de
   `Cart.test.tsx` lleva `timeout` propio (20000ms) — sin él falla de forma
   intermitente al correr la suite en paralelo. Ese test verifica layout, no
   velocidad.

10. **`MarcasModal` sin `gestion` en el POS.** `gestion={false}` oculta
    "Nueva marca", renombrar y eliminar, cambia el título a "Elegir marca" y
    **no monta** `CreateBrandModal` / `EditBrandModal` / `ConfirmModal`. El POS
    es una pantalla de venta: desde el mostrador se consulta una marca, no se
    dan de alta ni se borran.

11. **En el POS, el badge de no vendibles NO se toca.** El mensaje de "productos
    de esta marca sin stock" va en el `EmptyState` de `ProductGrid`, no en
    `NoVendiblesBadge.tsx`. Son dos cosas distintas: el badge cuenta
    bloqueados del catálogo completo; el EmptyState cubre el resultado de la
    búsqueda actual.

## 14. Testing

- **Vitest + Testing Library + jsdom.** 11 archivos, **203 tests**.
- `posQuery.test.ts` cubre la lógica pura (búsqueda, vistas, avisos, ticket,
  orden newest-first). `PosPage.test.tsx` cubre integración. `Cart.test.tsx`
  cubre layout/animación/confirmación.
- Patrón de mocks: se pisa `window.electronAPI` con
  `{ productos: { getAll: vi.fn().mockResolvedValue([...]) }, ... }`.
- `cleanup()` en `afterEach`.
- **Prueba de lógica pura con `pnpm exec vitest run <archivo>`** (barato y de
  alto valor). Para cambios chicos, alcanza con `tsc` + `lint`: **no correr la
  suite completa**.

## 15. Comandos

```bash
pnpm dev                                                   # desarrollo
pnpm exec tsc -p tsconfig.app.json --noEmit                 # tipos (OJO: tsconfig.app)
pnpm lint                                                  # eslint
pnpm test --run                                            # suite completa
pnpm exec vitest run src/features/pos/posQuery.test.ts      # un archivo
```

## 16. Estado actual y pendiente

**Hecho:** catálogo, búsqueda (nombre/marca/variante/código), categorías con
conteo, vistas bidimensionales, separación vendible/no vendible, ticket local,
mayoreo, métodos de pago, botón de marcas en modo consulta, placeholder de más
vendidos, ConfirmModal en Vaciar, atajo `mod+m`.

**Pendiente:**

1. **`Cobrar` es un stub**: hoy hace `toast.info(...)`. No registra la venta.
   Falta la tabla de ventas, el descuento de lotes y la transacción atómica.
2. **Escáner de código de barras en el POS**: el contexto `'sales'` ya existe
   en el store; falta registrarlo en `PosPage` y agregar al producto escaneado.
3. **"Más vendidos"**: solo el botón, sin consulta. Requiere definir qué es
   "vendido" (no hay tabla de ventas todavía, así que depende del punto 1).
4. **Los métodos de pago no se guardan** en ningún lado todavía.

Rama: `feat/pos-redesign`. **Sin commitear:** el trabajo de marcas, el
`EmptyState` de sin stock, el placeholder de más vendidos y el `ConfirmModal` de
Vaciar. `git mv` de `MarcasModal` quedó staged; el resto de los cambios no.

## 17. Regla de trabajo acordada

El usuario pidió explícitamente: **para cambios relativamente pequeños no correr
tests**. Con `tsc` + `lint` alcanza. La suite completa y las corridas repetidas de
estabilidad quedan reservadas para refactors grandes, antes de commitear, o
cuando la lógica sea pura y testeable.
