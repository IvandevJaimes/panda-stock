import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { obtenerDatosHuella, obtenerHuella, obtenerHuellaCruda, type FuentesHuella } from './huella.ts'

const carpetasTemporales: string[] = []

function crearCarpeta(): string {
  const carpeta = mkdtempSync(path.join(tmpdir(), 'panda-licencia-huella-'))
  carpetasTemporales.push(carpeta)
  return carpeta
}

afterEach(() => {
  for (const carpeta of carpetasTemporales.splice(0)) {
    rmSync(carpeta, { recursive: true, force: true })
  }
})

describe('huella de equipo', () => {
  it.each([
    ['win32', 'machine-guid-windows'],
    ['darwin', 'platform-uuid-macos'],
    ['linux', 'machine-id-linux'],
  ] as const)('lee la fuente inyectada para %s', (plataforma, identificador) => {
    const fuentes: FuentesHuella = {
      win32: () => 'machine-guid-windows',
      darwin: () => 'platform-uuid-macos',
      linux: () => 'machine-id-linux',
    }
    expect(obtenerHuellaCruda(fuentes, plataforma)).toBe(identificador)
  })

  it('calcula una huella compacta conservando los 256 bits', () => {
    const fuentes: FuentesHuella = {
      win32: () => null,
      darwin: () => null,
      linux: () => 'machine-id-test',
    }
    const resultado = obtenerDatosHuella(crearCarpeta(), fuentes, 'linux')
    const esperada = createHash('sha256')
      .update('panda-stock-hw-v1:machine-id-test')
      .digest('base64url')

    expect(resultado).toEqual({ huella: esperada })
    expect(resultado.huella).toHaveLength(43)
  })

  it('usa y persiste un identificador aleatorio si no hay fuente fuerte', () => {
    const carpeta = crearCarpeta()
    const fuentes: FuentesHuella = {
      win32: () => null,
      darwin: () => null,
      linux: () => null,
    }
    const primera = obtenerDatosHuella(carpeta, fuentes, 'linux')
    const segunda = obtenerDatosHuella(carpeta, fuentes, 'linux')
    const idPersistido = readFileSync(path.join(carpeta, 'instalacion-id'), 'utf8').trim()

    expect(primera.huella).toBe(segunda.huella)
    expect(primera.huella).toBe(obtenerHuella(carpeta, fuentes, 'linux'))
    expect(primera.advertencia).toMatch(/consultá con soporte/i)
    expect(idPersistido).toMatch(/^[0-9a-f-]{36}$/i)
  })

  it('falla al fallback también para plataformas sin lector configurado', () => {
    const fuentes: FuentesHuella = {
      win32: () => null,
      darwin: () => null,
      linux: () => null,
    }
    const resultado = obtenerDatosHuella(crearCarpeta(), fuentes, 'freebsd')
    expect(resultado.advertencia).toBeDefined()
    expect(resultado.huella).toHaveLength(43)
  })
})
