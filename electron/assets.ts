import { app, protocol } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const ASSET_EXTENSIONES_PERMITIDAS = new Set(['png', 'jpg', 'jpeg', 'webp'])

const MIME_POR_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

export function getAssetsRoot(): string {
  if (process.env.PANDA_STOCK_DB) return path.dirname(process.env.PANDA_STOCK_DB)
  return app.getPath('userData')
}

export function ensureAssetsFolders(): void {
  for (const carpeta of ['assets', 'assets/branchLogo', 'assets/productsImg']) {
    mkdirSync(path.join(getAssetsRoot(), carpeta), { recursive: true })
  }
}

/** Guarda el logo del negocio y devuelve su ruta relativa al root de assets. */
export function saveLogoFile(data: Uint8Array | ArrayBuffer, extension: string): string {
  const ext = extension.replace(/^\./, '').toLowerCase()
  if (!ASSET_EXTENSIONES_PERMITIDAS.has(ext)) {
    throw new Error(`Extensión de logo no permitida: "${extension}"`)
  }
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  const rutaRelativa = `assets/branchLogo/logo.${ext}`
  writeFileSync(path.join(getAssetsRoot(), rutaRelativa), bytes)
  return rutaRelativa
}

/**
 * Sirve archivos estáticos bajo panda-asset://asset/<ruta-relativa>.
 * Las rutas se resuelven siempre dentro de getAssetsRoot() para evitar traversal.
 */
export function registerPandaAssetProtocol(): void {
  protocol.handle('panda-asset', (request) => {
    try {
      const url = new URL(request.url)
      if (url.host !== 'asset') {
        return new Response('No encontrado', { status: 404 })
      }

      const urlPath = decodeURIComponent(url.pathname).replace(/^\/+/, '')
      const root = getAssetsRoot()
      const abs = path.resolve(root, urlPath)
      if (abs !== root && !abs.startsWith(root + path.sep)) {
        return new Response('Acceso denegado', { status: 403 })
      }
      if (abs === root || !existsSync(abs)) {
        return new Response('No encontrado', { status: 404 })
      }

      const ext = path.extname(abs).slice(1).toLowerCase()
      return new Response(new Uint8Array(readFileSync(abs)), {
        status: 200,
        headers: {
          'Content-Type': MIME_POR_EXTENSION[ext] ?? 'application/octet-stream',
          'Cache-Control': 'no-cache',
        },
      })
    } catch {
      return new Response('Error interno', { status: 500 })
    }
  })
}