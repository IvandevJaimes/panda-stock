import { create } from 'zustand'
import type { Negocio } from '../../electron/db/types'
import { buildAssetUrl } from '../lib/assets'

type NegocioStore = {
  nombre: string
  logoPath: string | null
  logoUrl: string | null
  cargado: boolean
  setNegocio: (negocio: Negocio) => void
  limpiar: () => void
}

export const useNegocioStore = create<NegocioStore>((set) => ({
  nombre: '',
  logoPath: null,
  logoUrl: null,
  cargado: false,
  setNegocio: (negocio) =>
    set({
      nombre: negocio.nombre ?? '',
      logoPath: negocio.logoPath ?? null,
      logoUrl: buildAssetUrl(negocio.logoPath),
      cargado: true,
    }),
  limpiar: () =>
    set({ nombre: '', logoPath: null, logoUrl: null, cargado: false }),
}))