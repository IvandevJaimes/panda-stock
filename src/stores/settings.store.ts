import { create } from 'zustand'

type SettingsState = {
  /** Nombre del comercio / local, editable en configuraciones. */
  storeName: string
  setStoreName: (name: string) => void
  /** Obliga a abrir una caja y registrar el turno antes de cobrar. */
  ventasPorCajas: boolean
  setVentasPorCajas: (active: boolean) => void
  /** Emite un sonido cuando llega una alerta roja o naranja. */
  sonidoAlertas: boolean
  setSonidoAlertas: (active: boolean) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  storeName: 'PANDA STOCK',
  setStoreName: (storeName) => set({ storeName }),
  ventasPorCajas: false,
  setVentasPorCajas: (ventasPorCajas) => set({ ventasPorCajas }),
  sonidoAlertas: false,
  setSonidoAlertas: (sonidoAlertas) => set({ sonidoAlertas }),
}))