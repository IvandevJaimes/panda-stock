export type FormatoExportacionReportes = 'excel' | 'pdf'

export type RangoExportacionReportes = {
  desde: string | null
  hasta: string | null
}

export type SolicitudExportacionReportes = RangoExportacionReportes & {
  formato: FormatoExportacionReportes
}
