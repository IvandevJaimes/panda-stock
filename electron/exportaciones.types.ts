/**
 * Contrato de la exportación a Excel.
 *
 * Van en un archivo propio y no dentro de `exportaciones.ts` porque el
 * renderer importa solo estos tipos: la implementación carga `electron` y
 * `write-excel-file`, que no pueden entrar al bundle de Vite.
 */
export type CeldaExcel = {
  value: string | number | boolean
  fontWeight?: 'bold'
  fontStyle?: 'italic'
  align?: 'left' | 'center' | 'right'
  textColor?: string
  backgroundColor?: string
  /** Celdas de título/sección que abarcan varias columnas. */
  columnSpan?: number
}

export type FilaExcel = CeldaExcel[]

export type HojaExcel = {
  /** Nombre de la pestaña en el libro; no puede llevar `[]:*?/\/`. */
  nombre: string
  filas: FilaExcel[]
}

export type ExportarExcelInput = {
  /** Nombre del archivo dentro de la carpeta destino, con o sin `.xlsx`. */
  nombreArchivo: string
  hojas: HojaExcel[]
  /**
   * Abre el diálogo nativo para elegir la carpeta de guardado. Si el usuario
   * lo cancela, la exportación devuelve `null`. Sin la flag se guarda directo
   * en el Escritorio.
   */
  elegirCarpeta?: boolean
}
