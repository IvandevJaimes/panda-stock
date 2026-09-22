/**
 * Versiones de cache por ruta de asset. Cuando se reemplaza una imagen manteniendo
 * el mismo nombre de archivo (ej. producto_5.png), la URL no cambia y Chromium
 * sirve la versión vieja cacheadad. bumpAssetUrl() incrementa la versión para que
 * buildAssetUrl() devuelva una URL distinta (?v=n) y fuerce el re-fetch.
 */
const versionesPorRuta = new Map<string, number>()

function normalizarRuta(ruta: string): string {
  return ruta.replace(/\\/g, '/').replace(/^\/+/, '')
}

export function bumpAssetVersion(rutaRelativa: string): number {
  const limpia = normalizarRuta(rutaRelativa)
  const version = (versionesPorRuta.get(limpia) ?? Date.now()) + 1
  versionesPorRuta.set(limpia, version)
  return version
}

export function buildAssetUrl(
  logoPath: string | null | undefined,
  version?: string | null | number,
): string | null {
  if (!logoPath) return null
  const limpio = normalizarRuta(logoPath)
    .split('/')
    .map(encodeURIComponent)
    .join('/')
  const base = `panda-asset://asset/${limpio}`
  const versionResuelta = version ?? versionesPorRuta.get(limpio)
  return versionResuelta != null
    ? `${base}?v=${encodeURIComponent(String(versionResuelta))}`
    : base
}