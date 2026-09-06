import { create } from 'zustand'

export type Theme = 'dark' | 'light'

type UIState = {
  theme: Theme
  /** Identificador del modal globalmente abierto (null = ninguno) */
  activeModal: string | null
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  openModal: (id: string) => void
  closeModal: () => void
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.remove('dark', 'light')
  root.classList.add(theme)
}

export const useUIStore = create<UIState>((set, get) => ({
  theme: 'dark',
  activeModal: null,
  setTheme: (theme) => {
    applyTheme(theme)
    set({ theme })
  },
  toggleTheme: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    set({ theme: next })
  },
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),
}))
