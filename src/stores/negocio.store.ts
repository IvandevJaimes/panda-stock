import { create } from 'zustand'
import type { Negocio } from '../../electron/db/types'
import { buildAssetUrl } from '../lib/assets'

type NegocioStore = {
  nombre: string
  logoPath: string | null
  logoUrl: string | null
  creadoEn: string | null
  actualizadoEn: string | null
  cargado: boolean
  setNegocio: (negocio: Negocio) => void
  limpiar: () => void
}

export const useNegocioStore = create<NegocioStore>((set) => ({
  nombre: '',
  logoPath: null,
  logoUrl: null,
  creadoEn: null,
  actualizadoEn: null,
  cargado: false,
  setNegocio: (negocio) =>
    set({
      nombre: negocio.nombre ?? '',
      logoPath: negocio.logoPath ?? null,
      logoUrl: buildAssetUrl(negocio.logoPath, negocio.actualizadoEn),
      creadoEn: negocio.creadoEn,
      actualizadoEn: negocio.actualizadoEn,
      cargado: true,
    }),
  limpiar: () =>
    set({ nombre: '', logoPath: null, logoUrl: null, creadoEn: null, actualizadoEn: null, cargado: false }),
}))
