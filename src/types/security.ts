export const CLAVES_PROTECCION = [
  'reportes',
  'cuentasCorrientes',
  'anularVentas',
  'eliminarProductos',
  'eliminarLotes',
  'eliminarCategorias',
  'eliminarMarcas',
] as const

export type ClaveProteccion = (typeof CLAVES_PROTECCION)[number]

export type ProteccionesSeguridad = Record<ClaveProteccion, boolean>

export const PROTECCIONES_INICIALES: ProteccionesSeguridad = {
  reportes: false,
  cuentasCorrientes: false,
  anularVentas: false,
  eliminarProductos: false,
  eliminarLotes: false,
  eliminarCategorias: false,
  eliminarMarcas: false,
}
