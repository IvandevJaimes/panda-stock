# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

---

## 📷 Lector de códigos de barras USB (modo HID Keyboard)

El servicio `src/services/barcode-scanner.service.ts` captura las ráfagas teclado
de la lectora en fase **capture global** (`window`, `capture: true`), antes de que
lleguen al input con foco, a React o al formulario.

### Cómo funciona (buffer especulativo)

- El **primer carácter** de una ráfaga se bloquea y retiene temporalmente.
- Si llega un **segundo carácter en ≤ 30 ms**, la secuencia se promueve a escaneo:
  ninguno de los caracteres tocó jamás el input.
- Los caracteres siguientes se bloquean; el **Enter** final se consume entero
  (no dispara submit ni click).
- Si el primer carácter **no tuvo seguimiento**, era tecleo humano y se entrega
  al input como pulsación normal.
- El tecleo humano normal (intervalos > 30 ms) nunca se pierde.

### Prueba manual (escáner físico)

Configurar la lectora en modo HID Keyboard con sufijo `Enter`. Escanear
`7791293044491` con el foco en cada uno de estos casos y verificar:

| Caso | Foco en | Esperado |
| ---- | ------- | -------- |
| A | **Nombre** | Nombre queda vacío; el campo **Código de barras** recibe `7791293044491` completo; no se guarda el formulario |
| B | **Precio** | Precio no cambia; Código de barras recibe el código completo |
| C | **Código de barras** (o Código interno) | El campo se completa con `7791293044491` sin duplicar el primer carácter (nada de `7, 7791293044491`) |
| D | **Stock** | Stock no cambia; Código de barras recibe el código completo |

Además:

- **Tecleo humano normal** (`779123` escrito a mano, con pausas) aparece tal cual
  en el campo enfocado y **no** se interpreta como escaneo.
- En modales de **venta (POS)**, el escaneo agrega el producto sin contaminar el
  buscador enfocado.
- Un **Enter aislado** (humano) mantiene su comportamiento normal.

### Suite automatizada

```bash
pnpm test          # suite completa (vitest run)
pnpm test:watch    # modo watch
```

Los tests (unitarios del servicio + integración del hook con Testing Library y
`userEvent`) simulan la ráfaga de la lectora tecla a tecla.
