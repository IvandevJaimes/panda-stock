import { app, BrowserWindow, dialog, nativeImage } from 'electron'
import ExcelJS from 'exceljs'
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { existsSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { getAssetsRoot } from './assets.ts'
import {
  getMovimientosStock,
  getNegocio,
  getProductos,
  getReportesSummary,
  getVentaDetalle,
  getVentas,
} from './db/repository.ts'
import type { MovimientoStock, ProductoConLoteActivo, ReportesSummary, Venta } from './db/types.ts'
import type {
  RangoExportacionReportes,
  SolicitudExportacionReportes,
} from './exportaciones.types.ts'

type MarcaReporte = { nombre: string; logoPng: Buffer; logoAncho: number; logoAlto: number }

const FORMATO_NUMERO_EXACTO = '#,##0.###############;-#,##0.###############;0'

const PALETA = {
  verde: 'FF10B981',
  verdeOscuro: 'FF047857',
  verdeClaro: 'FFD1FAE5',
  pizarra: 'FF1E2733',
  gris: 'FF64748B',
  grisClaro: 'FFF1F5F9',
  blanco: 'FFFFFFFF',
  rojo: 'FFDC2626',
}

function obtenerMarca(): MarcaReporte {
  const negocio = getNegocio()
  const raizAssets = path.resolve(getAssetsRoot())
  const rutaPersonalizadaCandidata = negocio?.logoPath
    ? path.resolve(raizAssets, negocio.logoPath)
    : null
  const rutaPersonalizada = rutaPersonalizadaCandidata?.startsWith(`${raizAssets}${path.sep}`)
    ? rutaPersonalizadaCandidata
    : null
  const rutaLogoPanda = path.join(app.getAppPath(), 'dist', 'panda-stock-logo-512x512.png')
  const rutaLogo = rutaPersonalizada && existsSync(rutaPersonalizada)
    ? rutaPersonalizada
    : rutaLogoPanda
  const imagen = nativeImage.createFromPath(rutaLogo)
  const respaldo = nativeImage.createFromPath(rutaLogoPanda)
  const logo = !imagen.isEmpty() ? imagen : respaldo

  if (logo.isEmpty()) throw new Error('No se pudo cargar el logo para el reporte')

  return {
    nombre: negocio?.nombre?.trim() || 'Panda Stock',
    logoPng: logo.toPNG(),
    logoAncho: logo.getSize().width,
    logoAlto: logo.getSize().height,
  }
}

function limitarDimensionesImagen(ancho: number, alto: number, maxAncho: number, maxAlto: number) {
  const escala = Math.min(maxAncho / ancho, maxAlto / alto)
  return { width: ancho * escala, height: alto * escala }
}

function formatearFecha(valor: string | null | undefined): string {
  if (!valor) return '—'
  const fecha = new Date(valor)
  return Number.isNaN(fecha.getTime()) ? valor : fecha.toLocaleString('es-AR')
}

function describirRangoExportacion(rango: RangoExportacionReportes): string {
  const desde = rango.desde ? new Date(rango.desde).toLocaleDateString('es-AR') : null
  const hasta = rango.hasta ? new Date(rango.hasta).toLocaleDateString('es-AR') : null
  if (desde && hasta) return desde === hasta ? desde : `${desde} - ${hasta}`
  if (desde) return `Desde ${desde}`
  if (hasta) return `Hasta ${hasta}`
  return 'Todo el historial'
}

function validarRangoExportacion(rango: RangoExportacionReportes): void {
  const desde = rango.desde ? new Date(rango.desde).getTime() : null
  const hasta = rango.hasta ? new Date(rango.hasta).getTime() : null
  if (desde !== null && Number.isNaN(desde)) throw new Error('La fecha inicial no es válida')
  if (hasta !== null && Number.isNaN(hasta)) throw new Error('La fecha final no es válida')
  if (desde !== null && hasta !== null && desde > hasta) {
    throw new Error('La fecha inicial no puede ser posterior a la fecha final')
  }
}

function valorInventario(productos: ProductoConLoteActivo[]): number {
  return productos.reduce((suma, producto) => suma + producto.stockActual * producto.costo, 0)
}

function agregarMarcaExcel(
  workbook: ExcelJS.Workbook,
  sheet: ExcelJS.Worksheet,
  marca: MarcaReporte,
  periodo: string,
  fechaGeneracion: Date,
): number {
  sheet.mergeCells('C1:G1')
  sheet.mergeCells('C2:G2')
  sheet.mergeCells('C3:G3')
  sheet.getCell('C1').value = marca.nombre
  sheet.getCell('C1').font = { name: 'Aptos Display', size: 20, bold: true, color: { argb: PALETA.pizarra } }
  sheet.getCell('C2').value = `Período exportado: ${periodo}`
  sheet.getCell('C2').font = { size: 12, bold: true, color: { argb: PALETA.verdeOscuro } }
  sheet.getCell('C3').value = `Generado: ${fechaGeneracion.toLocaleString('es-AR')}`
  sheet.getCell('C3').font = { size: 10, color: { argb: PALETA.gris } }
  sheet.getRow(1).height = 26
  sheet.getRow(2).height = 20
  sheet.getRow(3).height = 18
  sheet.getRow(4).height = 8
  sheet.getColumn(1).width = 16
  sheet.getColumn(2).width = 12

  const logoId = workbook.addImage({
    base64: `data:image/png;base64,${marca.logoPng.toString('base64')}`,
    extension: 'png',
  })
  sheet.addImage(logoId, {
    tl: { col: 0, row: 0 },
    ext: limitarDimensionesImagen(marca.logoAncho, marca.logoAlto, 96, 54),
  })
  return 6
}

function agregarTituloHoja(sheet: ExcelJS.Worksheet, fila: number, titulo: string): number {
  const celda = sheet.getCell(fila, 1)
  celda.value = titulo
  celda.font = { bold: true, size: 13, color: { argb: PALETA.pizarra } }
  celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA.verdeClaro } }
  sheet.mergeCells(fila, 1, fila, Math.max(sheet.columnCount, 2))
  return fila + 1
}

function agregarTabla(
  sheet: ExcelJS.Worksheet,
  fila: number,
  encabezados: string[],
  registros: Array<Array<string | number>>,
): number {
  const filaEncabezados = sheet.addRow(encabezados)
  filaEncabezados.height = 30
  filaEncabezados.eachCell((celda) => {
    celda.font = { bold: true, color: { argb: PALETA.blanco } }
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA.verde } }
    celda.alignment = { vertical: 'middle', wrapText: true }
  })
  for (const registro of registros) {
    const row = sheet.addRow(registro)
    row.height = 25
    row.eachCell((celda) => {
      celda.alignment = {
        vertical: 'middle',
        wrapText: true,
        horizontal: typeof celda.value === 'number' ? 'right' : 'left',
      }
      if (typeof celda.value === 'number') celda.numFmt = FORMATO_NUMERO_EXACTO
      if (row.number % 2 === 0) {
        celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
      }
    })
  }
  return fila + registros.length + 1
}

function ajustarColumnasYFilas(sheet: ExcelJS.Worksheet, anchos: number[]): void {
  anchos.forEach((ancho, indice) => {
    sheet.getColumn(indice + 1).width = ancho
  })

  sheet.eachRow((row, numeroFila) => {
    if (numeroFila < 6) return
    const rellenoTitulo = row.getCell(1).fill
    if (rellenoTitulo?.type === 'pattern' && rellenoTitulo.fgColor?.argb === PALETA.verdeClaro) {
      row.height = Math.max(row.height ?? 0, 26)
      return
    }
    let lineasMaximas = 1
    row.eachCell((celda, indice) => {
      if (typeof celda.value !== 'string') return
      const ancho = Math.max(sheet.getColumn(indice).width ?? 12, 6)
      const lineas = celda.value.split('\n').reduce(
        (total, texto) => total + Math.max(1, Math.ceil(texto.length / ancho)),
        0,
      )
      lineasMaximas = Math.max(lineasMaximas, lineas)
    })
    row.height = Math.max(row.height ?? 0, Math.min(lineasMaximas * 15, 96), 24)
  })
}

function crearWorkbook(
  marca: MarcaReporte,
  periodo: string,
  fechaGeneracion: Date,
  resumen: ReportesSummary,
  ventas: Venta[],
  movimientos: MovimientoStock[],
  productos: ProductoConLoteActivo[],
): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = marca.nombre
  workbook.created = fechaGeneracion
  workbook.modified = fechaGeneracion

  const inventario = valorInventario(productos)
  const hojas = [
    workbook.addWorksheet('Resumen'),
    workbook.addWorksheet('Ventas'),
    workbook.addWorksheet('Movimientos'),
    workbook.addWorksheet('Mermas'),
    workbook.addWorksheet('Cortes de caja'),
    workbook.addWorksheet('Inventario'),
  ]
  const [hojaResumen, hojaVentas, hojaMovimientos, hojaMermas, hojaCortes, hojaInventario] = hojas
  if (!hojaResumen || !hojaVentas || !hojaMovimientos || !hojaMermas || !hojaCortes || !hojaInventario) {
    throw new Error('No se pudieron crear las pestañas del reporte')
  }

  for (const sheet of hojas) agregarMarcaExcel(workbook, sheet, marca, periodo, fechaGeneracion)

  let fila = agregarTituloHoja(hojaResumen, 6, 'Métricas generales del período')
  const metricas: Array<[string, number]> = [
    ['Ventas netas', resumen.totalVentas],
    ['Dinero cobrado neto', resumen.totalCobrado],
    ['Cantidad de ventas completadas', resumen.cantVentas],
    ['Ticket promedio', resumen.cantVentas ? resumen.totalVentas / resumen.cantVentas : 0],
    ['Valor del inventario actual', inventario],
    ['Productos registrados', productos.length],
    ['Productos bajo stock mínimo', productos.filter((p) => p.stockActual < p.stockMinimo).length],
    ['Movimientos de stock', resumen.movimientos.cantidad],
    ['Unidades movidas', resumen.movimientos.unidades],
    ['Mermas', resumen.perdidas.cantidadMermas],
    ['Unidades perdidas', resumen.perdidas.unidadesPerdidas],
    ['Pérdida valuada', resumen.perdidas.plataPerdida],
    ['Cortes de caja', resumen.cortes.cantidad],
    ['Descuadre neto de cajas', resumen.cortes.diferenciaTotal],
  ]
  agregarTabla(hojaResumen, fila, ['Métrica', 'Valor'], metricas)
  fila += metricas.length + 3
  fila = agregarTituloHoja(hojaResumen, fila, 'Ventas por medio de pago')
  agregarTabla(hojaResumen, fila, ['Medio', 'Monto neto'], resumen.ventasPorMetodo.map((pago) => [pago.metodo, pago.monto]))
  fila += resumen.ventasPorMetodo.length + 3
  fila = agregarTituloHoja(hojaResumen, fila, 'Ventas y cobros por día')
  agregarTabla(
    hojaResumen,
    fila,
    ['Fecha', 'Ventas', 'Abonos', 'Unidades', 'Cobro neto'],
    resumen.ventasPorDia.map((dia) => [dia.fecha, dia.ventas, dia.abonos, dia.unidades, dia.total]),
  )
  fila += resumen.ventasPorDia.length + 3
  fila = agregarTituloHoja(hojaResumen, fila, 'Productos más vendidos')
  agregarTabla(
    hojaResumen,
    fila,
    ['Producto', 'Unidades', 'Monto neto'],
    resumen.productosMasVendidos.map((producto) => [producto.nombre, producto.cantidad, producto.monto]),
  )
  fila += resumen.productosMasVendidos.length + 3
  fila = agregarTituloHoja(hojaResumen, fila, 'Productos con más ingresos')
  agregarTabla(
    hojaResumen,
    fila,
    ['Producto', 'Unidades', 'Monto neto'],
    resumen.productosMayorIngreso.map((producto) => [producto.nombre, producto.cantidad, producto.monto]),
  )
  fila += resumen.productosMayorIngreso.length + 3
  fila = agregarTituloHoja(hojaResumen, fila, 'Movimientos por tipo')
  agregarTabla(
    hojaResumen,
    fila,
    ['Tipo', 'Movimientos', 'Unidades'],
    resumen.movimientos.porTipo.map((movimiento) => [movimiento.tipo, movimiento.cantidad, movimiento.unidades]),
  )
  fila += resumen.movimientos.porTipo.length + 3
  fila = agregarTituloHoja(hojaResumen, fila, 'Pérdidas por producto')
  agregarTabla(
    hojaResumen,
    fila,
    ['Producto', 'Unidades perdidas', 'Sin valuar', 'Pérdida estimada'],
    resumen.perdidas.porProducto.map((perdida) => [perdida.nombre, perdida.unidades, perdida.unidadesSinValuar, perdida.perdido]),
  )

  const detallesVenta = new Map(ventas.map((venta) => [venta.id, getVentaDetalle(venta.id)]))
  agregarTituloHoja(hojaVentas, 6, 'Ventas del período')
  agregarTabla(
    hojaVentas,
    7,
    ['ID', 'Fecha', 'Estado', 'Empleado', 'Cliente', 'Productos', 'Métodos de pago', 'Subtotal', 'Descuento', 'Impuesto', 'Total'],
    ventas.map((venta) => {
      const detalle = detallesVenta.get(venta.id)
      return [
        venta.id,
        formatearFecha(venta.fechaHora),
        venta.estado,
        detalle?.empleadoNombre ?? '—',
        detalle?.clienteNombre ?? '—',
        detalle?.items.map((item) => `${item.descripcionItem} × ${item.cantidad}`).join('\n') ?? '',
        detalle?.pagos.map((pago) => `${pago.metodo}: ${pago.monto}`).join('\n') ?? '',
        venta.subtotal,
        venta.descuento,
        venta.impuesto,
        venta.total,
      ]
    }),
  )
  const nombrePorId = new Map(productos.map((producto) => [producto.id, producto.nombre]))
  agregarTituloHoja(hojaMovimientos, 6, 'Movimientos de stock del período')
  agregarTabla(
    hojaMovimientos,
    7,
    ['ID', 'Fecha', 'Producto', 'Tipo', 'Cantidad', 'Costo unitario ref.', 'Stock anterior', 'Stock posterior', 'Venta ID', 'Lote ID', 'Motivo'],
    movimientos.map((movimiento) => [
      movimiento.id,
      formatearFecha(movimiento.fechaHora),
      movimiento.productoId === null ? 'Producto eliminado' : nombrePorId.get(movimiento.productoId) ?? 'Producto sin referencia',
      movimiento.tipo,
      movimiento.cantidad,
      movimiento.costoUnitarioReferencia ?? 0,
      movimiento.stockAnterior ?? '—',
      movimiento.stockPosterior ?? '—',
      movimiento.ventaId ?? '—',
      movimiento.loteId ?? '—',
      movimiento.motivo ?? '',
    ]),
  )
  agregarTituloHoja(hojaMermas, 6, 'Detalle completo de mermas')
  agregarTabla(
    hojaMermas,
    7,
    ['ID', 'Fecha', 'Producto', 'Cantidad', 'Costo unitario', 'Pérdida estimada', 'Fuente de costo', 'Motivo'],
    resumen.perdidas.mermas.map((merma) => [
      merma.id,
      formatearFecha(merma.fechaHora),
      merma.nombreProducto,
      merma.cantidad,
      merma.costoUnitario ?? 0,
      merma.perdidaEstimada ?? 0,
      merma.fuenteCosto,
      merma.motivo ?? '',
    ]),
  )
  agregarTituloHoja(hojaCortes, 6, 'Cortes de caja del período')
  agregarTabla(
    hojaCortes,
    7,
    ['ID', 'Empleado', 'Apertura', 'Cierre', 'Monto inicial', 'Monto esperado', 'Monto real', 'Diferencia', 'Observaciones'],
    resumen.cortes.cortes.map((corte) => [
      corte.id,
      corte.empleadoNombre,
      formatearFecha(corte.fechaApertura),
      formatearFecha(corte.fechaCierre),
      corte.montoInicial,
      corte.montoEsperado ?? '—',
      corte.montoReal ?? '—',
      corte.diferencia ?? '—',
      corte.observaciones ?? '',
    ]),
  )
  agregarTituloHoja(hojaInventario, 6, 'Estado actual del inventario')
  agregarTabla(
    hojaInventario,
    7,
    ['ID', 'Producto', 'Código interno', 'Categoría ID', 'Marca ID', 'Costo unitario', 'Precio de venta', 'Stock actual', 'Stock mínimo', 'Valor de stock', 'Activo', 'Vencimiento'],
    productos.map((producto) => [
      producto.id,
      producto.nombre,
      producto.codigoInterno ?? '',
      producto.categoriaId ?? '—',
      producto.marcaId ?? '—',
      producto.costo,
      producto.precioVenta,
      producto.stockActual,
      producto.stockMinimo,
      producto.stockActual * producto.costo,
      producto.activo ? 'Sí' : 'No',
      producto.vencimiento ?? '—',
    ]),
  )

  for (const [sheet, columnas, cantidad] of [
    [hojaVentas, 11, ventas.length],
    [hojaMovimientos, 11, movimientos.length],
    [hojaMermas, 8, resumen.perdidas.mermas.length],
    [hojaCortes, 9, resumen.cortes.cortes.length],
    [hojaInventario, 12, productos.length],
  ] as const) {
    sheet.autoFilter = { from: { row: 7, column: 1 }, to: { row: 7 + cantidad, column: columnas } }
    sheet.views = [{ state: 'frozen', ySplit: 7 }]
  }

  for (const sheet of hojas) {
    sheet.views = [{ showGridLines: false, state: 'frozen', ySplit: 7 }]
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = { bottom: { style: 'hair', color: { argb: PALETA.grisClaro } } }
      })
    })
  }

  ajustarColumnasYFilas(hojaResumen, [38, 22, 20, 18, 18])
  ajustarColumnasYFilas(hojaVentas, [12, 21, 16, 24, 24, 42, 30, 19, 17, 17, 19])
  ajustarColumnasYFilas(hojaMovimientos, [12, 21, 34, 22, 16, 23, 18, 18, 14, 14, 38])
  ajustarColumnasYFilas(hojaMermas, [12, 21, 34, 16, 21, 23, 23, 38])
  ajustarColumnasYFilas(hojaCortes, [12, 24, 21, 21, 20, 21, 20, 19, 38])
  ajustarColumnasYFilas(hojaInventario, [12, 36, 20, 16, 16, 20, 20, 17, 17, 20, 12, 21])
  return workbook
}

function agregarMarcaPdf(doc: jsPDF, marca: MarcaReporte, periodo: string, fechaGeneracion: Date): void {
  const logoBase64 = `data:image/png;base64,${marca.logoPng.toString('base64')}`
  const dimensionesLogo = limitarDimensionesImagen(marca.logoAncho, marca.logoAlto, 20, 16)
  doc.addImage(logoBase64, 'PNG', 16, 9, dimensionesLogo.width, dimensionesLogo.height)
  const inicioTexto = 16 + dimensionesLogo.width + 6
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(30, 39, 51)
  doc.text(marca.nombre, inicioTexto, 18)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text(`Período exportado: ${periodo}`, inicioTexto, 23)
  doc.text(`Generado: ${fechaGeneracion.toLocaleString('es-AR')}`, inicioTexto, 28)
  doc.setDrawColor(16, 185, 129)
  doc.setLineWidth(0.7)
  doc.line(16, 34, 194, 34)
}

function tablaPdf(
  doc: jsPDF,
  titulo: string,
  filas: Array<[string, string]>,
  startY: number,
): number {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(30, 39, 51)
  doc.text(titulo, 16, startY)
  autoTable(doc, {
    startY: startY + 4,
    margin: { left: 16, right: 16, bottom: 14 },
    head: [['Indicador', 'Valor']],
    body: filas,
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 2.5, textColor: [51, 65, 85] },
    columnStyles: { 1: { halign: 'right' } },
  })
  const ultimo = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY
  return typeof ultimo === 'number' ? ultimo + 10 : startY + 20
}

function crearPdf(
  marca: MarcaReporte,
  periodo: string,
  fechaGeneracion: Date,
  resumen: ReportesSummary,
  productos: ProductoConLoteActivo[],
): ArrayBuffer {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const numero = (valor: number) => {
    const formateado = Math.abs(valor).toLocaleString('es-AR', { maximumFractionDigits: 15 })
    return valor < 0 ? `-${formateado}` : formateado
  }
  const moneda = (monto: number) => monto < 0 ? `-$${numero(-monto)}` : `$${numero(monto)}`
  const stockValuado = valorInventario(productos)
  let y = 40

  agregarMarcaPdf(doc, marca, periodo, fechaGeneracion)
  y = tablaPdf(doc, 'Resumen de ventas', [
    ['Ventas netas del período', moneda(resumen.totalVentas)],
    ['Dinero cobrado neto', moneda(resumen.totalCobrado)],
    ['Ventas completadas', String(resumen.cantVentas)],
    ['Ticket promedio', moneda(resumen.cantVentas ? resumen.totalVentas / resumen.cantVentas : 0)],
  ], y)
  y = tablaPdf(doc, 'Cobros netos por medio de pago', resumen.ventasPorMetodo.map((fila) => [fila.metodo, moneda(fila.monto)]), y)
  tablaPdf(doc, 'Resumen de inventario', [
    ['Valor del stock actual', moneda(stockValuado)],
    ['Productos registrados', String(productos.length)],
    ['Productos bajo stock mínimo', String(productos.filter((producto) => producto.stockActual < producto.stockMinimo).length)],
  ], y)

  doc.addPage()
  agregarMarcaPdf(doc, marca, periodo, fechaGeneracion)
  y = tablaPdf(doc, 'Movimientos de stock', [
    ['Movimientos registrados', String(resumen.movimientos.cantidad)],
    ['Unidades movidas', numero(resumen.movimientos.unidades)],
    ...resumen.movimientos.porTipo.map((fila) => [`${fila.tipo} · movimientos`, String(fila.cantidad)] as [string, string]),
    ...resumen.movimientos.porTipo.map((fila) => [`${fila.tipo} · unidades`, numero(fila.unidades)] as [string, string]),
  ], 40)
  y = tablaPdf(doc, 'Mermas y pérdidas', [
    ['Mermas registradas', String(resumen.perdidas.cantidadMermas)],
    ['Unidades perdidas', numero(resumen.perdidas.unidadesPerdidas)],
    ['Mermas sin costo valuado', String(resumen.perdidas.cantidadSinValuar)],
    ['Pérdida valuada por costo de lote', moneda(resumen.perdidas.plataPorCostoLote)],
    ['Pérdida valuada por costo de referencia', moneda(resumen.perdidas.plataPorReferencia)],
    ['Pérdida total valuada', moneda(resumen.perdidas.plataPerdida)],
  ], y)
  tablaPdf(doc, 'Cortes de caja', [
    ['Cortes cerrados', String(resumen.cortes.cantidad)],
    ['Cortes con arqueo', String(resumen.cortes.cortesConDatos)],
    ['Cortes sin datos de arqueo', String(resumen.cortes.sinDatosArqueo)],
    ['Cortes con diferencia', String(resumen.cortes.conDescuadre)],
    ['Diferencia neta acumulada', moneda(resumen.cortes.diferenciaTotal)],
  ], y)

  const paginas = doc.getNumberOfPages()
  for (let pagina = 1; pagina <= paginas; pagina++) {
    doc.setPage(pagina)
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text(`Página ${pagina} de ${paginas}`, 194, 287, { align: 'right' })
  }
  return doc.output('arraybuffer')
}

export async function exportarReportes(
  solicitud: SolicitudExportacionReportes,
  ventana: BrowserWindow | null,
): Promise<string | null> {
  const { formato, desde, hasta } = solicitud
  if (formato !== 'excel' && formato !== 'pdf') throw new Error('Formato de exportación no válido')
  const rango = { desde, hasta }
  validarRangoExportacion(rango)

  const marca = obtenerMarca()
  const periodo = describirRangoExportacion(rango)
  const fechaGeneracion = new Date()
  const filtros = {
    ...(desde === null ? {} : { desde }),
    ...(hasta === null ? {} : { hasta }),
  }
  const resumen = getReportesSummary({ ...filtros, topProductos: 100_000 })
  const ventas = getVentas(filtros)
  const movimientos = getMovimientosStock(filtros)
  const productos = getProductos()
  const buffer = formato === 'excel'
    ? await crearWorkbook(marca, periodo, fechaGeneracion, resumen, ventas, movimientos, productos).xlsx.writeBuffer()
    : crearPdf(marca, periodo, fechaGeneracion, resumen, productos)
  const extension = formato === 'excel' ? 'xlsx' : 'pdf'
  const nombreBase = marca.nombre.replace(/[<>:"/\\|?*]/g, '').trim() || 'Panda Stock'
  const fecha = new Date().toISOString().slice(0, 10)
  const opcionesDialogo = {
    title: `Exportar reportes a ${formato === 'excel' ? 'Excel' : 'PDF'}`,
    defaultPath: path.join(app.getPath('desktop'), `${nombreBase}_Reportes_${fecha}.${extension}`),
    filters: [{ name: formato === 'excel' ? 'Excel' : 'PDF', extensions: [extension] }],
  }
  const resultado = ventana
    ? await dialog.showSaveDialog(ventana, opcionesDialogo)
    : await dialog.showSaveDialog(opcionesDialogo)
  if (resultado.canceled || !resultado.filePath) return null

  const ruta = resultado.filePath.toLowerCase().endsWith(`.${extension}`)
    ? resultado.filePath
    : `${resultado.filePath}.${extension}`
  writeFileSync(ruta, Buffer.from(buffer))
  return ruta
}
