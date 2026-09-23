import pandaLogoDataUrl from '../assets/panda-stock-logo.svg?inline'

/**
 * Banco de colores pastel. Cada placeholder usa UNO aleatorio
 * (>= 10 disponibles): con el logo de Panda Stock al centro.
 */
const PASTEL_COLORES: string[] = [
  // Rosas
  '#F2758C', '#EE5D8E', '#F06D9C', '#EF7E95', '#F08F8F', '#F4728C',
  '#EF8EA9', '#F2768A', '#EA6A6C', '#F07C9E',
  // Naranjas y duraznos
  '#F48B6B', '#F5A25D', '#F59E4C', '#F29E5A', '#EF9A66', '#F2A46C',
  '#ED9B5F', '#F7A251',
  // Ambar y amarillos
  '#E7B341', '#EDCA5A', '#E8C84A', '#EEC453', '#F0CD5F', '#E6D452',
  '#EFD060', '#E5C95B', '#F0D16A',
  // Limas y verdes
  '#A9CE4B', '#9CD24A', '#8FCE4F', '#A7D161', '#99CC66', '#8CC85A',
  '#93CD5C', '#7FC96F', '#65C878', '#5FC98C',
  // Verdes menta y agua
  '#6FCF7A', '#7ACC7B', '#66CD87', '#57C98D', '#56CCB2', '#5AC8BB',
  '#49C3B8', '#5BC6C3', '#4FC7CB', '#52C0C9', '#5BC0BE', '#4ED3D3',
  // Azules
  '#6FB6EB', '#5A9BF0', '#5F9AF0', '#6DA6EA', '#7BB5E8', '#6396E8',
  '#74A7E8', '#5E9BE8', '#88B5E6', '#6AA6DE', '#5B9EE8',
  // Acero y periwinkle
  '#8AA8D8', '#8A9EE8', '#7E94E8', '#91A4E8', '#8494D8', '#7F9BD8',
  '#98ACDE',
  // Lavandas, violetas y morados
  '#A78BFA', '#9784E8', '#B58CE8', '#A088E8', '#9C83E8', '#B08DE8',
  '#AE8FCE', '#A788DC', '#BB8EE8', '#9E84DC',
  // Fucsias y magentas
  '#D98BE0', '#D571DC', '#E07FD6', '#DB8AD0', '#E18FD8', '#D893C8',
  '#CE76D6', '#EE8EC4', '#E682B8', '#E88AA8',
  // Oliva y tonos tierra pastel
  '#A3B662', '#B9A55C', '#C5A34F', '#AEAB55', '#C9A868', '#B8A25C',
]

const TAMANIO = 512
const CACHE_MAX = 200

/** Hash determinista (djb2) para derivar el color del seed sin colisiones obvias. */
function hashSeed(seed: string): number {
  let hash = 5381
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 33) ^ seed.charCodeAt(i)
  }
  return hash >>> 0
}

function construirSvg(
  color: string,
  logoHref: string,
  texto?: string,
): string {
  // Sin texto: logo centrado. Con texto (placeholder grande): el logo sube
  // y el nombre queda debajo, ambos centrados horizontalmente.
  const logo = texto
    ? `<image href="${logoHref}" x="106" y="56" width="300" height="300" preserveAspectRatio="xMidYMid meet"/>` +
      `<text x="256" y="406" text-anchor="middle" font-family="Rubik, ui-sans-serif, system-ui, sans-serif" font-size="52" font-weight="700" fill="#ffffff">${texto}</text>`
    : `<image href="${logoHref}" x="116" y="116" width="280" height="280" preserveAspectRatio="xMidYMid meet"/>`

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${TAMANIO}" height="${TAMANIO}" viewBox="0 0 ${TAMANIO} ${TAMANIO}">` +
    `<rect width="${TAMANIO}" height="${TAMANIO}" fill="${color}"/>` +
    logo +
    `</svg>`
  )
}

const cache = new Map<string, string>()

function obtenerDataUrl(
  variante: string,
  seed: string | number | undefined,
  texto?: string,
): string {
  const claveSeed = seed === undefined ? 'aleatorio' : String(seed)
  const clave = `${variante}:${claveSeed}`
  const cacheado = cache.get(clave)
  if (cacheado) return cacheado

  // El color depende SOLO del seed (no de la variante) para que la card y el
  // detalle del mismo producto compartan el mismo pastel.
  const indice = seed === undefined
    ? Math.floor(Math.random() * PASTEL_COLORES.length)
    : hashSeed(claveSeed) % PASTEL_COLORES.length

  const svg = construirSvg(PASTEL_COLORES[indice], pandaLogoDataUrl, texto)
  const dataUrl = `data:image/svg+xml;base64,${window.btoa(svg)}`

  cache.set(clave, dataUrl)
  if (cache.size > CACHE_MAX) {
    const masAntiguo = cache.keys().next().value
    if (masAntiguo !== undefined) cache.delete(masAntiguo)
  }
  return dataUrl
}

/**
 * Placeholder generico de producto sin foto: UN color pastel aleatorio de fondo
 * (misma foto => mismo color, gracias al seed) y el logo de Panda Stock al centro.
 * Devuelve un data URL SVG memoizado por seed.
 */
export function getProductPlaceholder(seed?: string | number): string {
  return obtenerDataUrl('simple', seed)
}

/**
 * Placeholder "grande" para usos con más espacio (ej. detalle de producto):
 * mismo color pastel aleatorio + logo de Panda Stock al centro y el nombre
 * "PANDA STOCK" debajo.
 */
export function getProductPlaceholderLarge(seed?: string | number): string {
  return obtenerDataUrl('grande', seed, 'PANDA STOCK')
}