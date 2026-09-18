import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron/simple'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          build: {
            rolldownOptions: {
              external: [
                /^better-sqlite3/,
                /^drizzle-orm(\/.*)?$/,
              ],
            },
          },
        },
      },
      preload: {
        input: 'electron/preload.ts',
        // Los preloads sandboxed solo soportan CommonJS (no ESM)
        vite: {
          build: {
            rolldownOptions: {
              output: {
                format: 'cjs',
                entryFileNames: '[name].cjs',
              },
            },
          },
        },
      },
    }),
  ],
})
