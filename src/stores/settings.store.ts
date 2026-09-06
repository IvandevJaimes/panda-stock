import { create } from 'zustand'

type SettingsState = {
  /** Nombre del comercio / local, editable en configuraciones. */
  storeName: string
  setStoreName: (name: string) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  storeName: 'PANDA STOCK',
  setStoreName: (storeName) => set({ storeName }),
}))
