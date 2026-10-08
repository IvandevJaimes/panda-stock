import { app, dialog } from 'electron'
import path from 'node:path'
import writeExcelFile from 'write-excel-file/node'
import type { ExportarExcelInput } from './exportaciones.types.ts'

/** Carácteres que Windows rechaza en nombres de archivo. */
const INVALIDOS = /[<>:"/\\|?*]/g

function nombreSeguro(nombre: string): string {
  const base = nombre.replace(INVALIDOS, '').trim() || 'reporte'
  return base.toLowerCase().endsWith('.xlsx') ? base : `${base}.xlsx`
}

/**
 * Escribe el libro y devuelve la ruta absoluta, o `null` si el usuario
 * canceló la elección de carpeta.
 *
 * El nombre lleva fecha y hora para que dos exportaciones seguidas no pisen
 * el archivo; sin `elegirCarpeta` se guarda directo en el Escritorio.
 */
export async function exportarExcel(
  input: ExportarExcelInput,
): Promise<string | null> {
  if (input.hojas.length === 0) throw new Error('No hay nada que exportar')
  for (const hoja of input.hojas) {
    if (hoja.filas.length === 0) {
      throw new Error(`La hoja "${hoja.nombre}" no tiene filas`)
    }
  }

  let carpeta = app.getPath('desktop')
  if (input.elegirCarpeta) {
    const eleccion = await dialog.showOpenDialog({
      title: 'Elegir carpeta donde guardar el reporte',
      defaultPath: carpeta,
      properties: ['openDirectory', 'createDirectory'],
    })
    if (eleccion.canceled || eleccion.filePaths.length === 0) return null
    carpeta = eleccion.filePaths[0]!
  }

  const ruta = path.join(carpeta, nombreSeguro(input.nombreArchivo))

  await writeExcelFile(
    input.hojas.map((hoja) => ({ sheet: hoja.nombre, data: hoja.filas })),
  ).toFile(ruta)

  return ruta
}
