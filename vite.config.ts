import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron/simple'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => {
  const esBuild = command === 'build'
  const esDesarrolloDePnpm = command === 'serve' && process.env.npm_lifecycle_event === 'dev'
  const licenciaDefault = esDesarrolloDePnpm ? 'off' : 'on'
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      electron({
        main: {
          entry: 'electron/main.ts',
          vite: {
            define: {
              __PANDA_STOCK_LICENCIA_DEFAULT__: JSON.stringify(licenciaDefault),
            },
            build: {
              minify: esBuild,
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
              minify: esBuild,
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
  }
})
