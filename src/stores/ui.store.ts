import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type Theme = 'dark' | 'light'

type UIState = {
  theme: Theme
  /** Identificador del modal globalmente abierto (null = ninguno) */
  activeModal: string | null
  /** Estado del sidebar/drawer colapsable desde la derecha */
  isRightSidebarOpen: boolean
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  openModal: (id: string) => void
  closeModal: () => void
  toggleRightSidebar: () => void
  closeRightSidebar: () => void
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.remove('dark', 'light')
  root.classList.add(theme)
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      activeModal: null,
      isRightSidebarOpen: false,
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
      toggleRightSidebar: () => set((state) => ({ isRightSidebarOpen: !state.isRightSidebarOpen })),
      closeRightSidebar: () => set({ isRightSidebarOpen: false }),
    }),
    {
      name: 'panda-ui-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ theme: state.theme }),
    },
  ),
)

// Sincroniza el DOM con el tema rehidratado desde la persistencia para evitar parpadeo al iniciar.
applyTheme(useUIStore.getState().theme)