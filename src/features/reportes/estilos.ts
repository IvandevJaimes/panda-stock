/**
 * Sombra de las cards de Reportes: una capa de contacto que despega el borde y
 * otra muy abierta que cae hacia abajo. Una sola sombra plana se leía como que
 * la card era parte del fondo en vez de un bloque puesto encima.
 *
 * En dark la capa abierta sube de opacidad porque sobre `#111827` un negro al
 * 12% no se distingue del fondo.
 */
export const SOMBRA_CARD =
  'shadow-[0_1px_2px_rgba(15,23,42,0.05),0_8px_20px_-8px_rgba(15,23,42,0.12)]' +
  ' dark:shadow-[0_1px_2px_rgba(0,0,0,0.35),0_10px_24px_-10px_rgba(0,0,0,0.60)]'