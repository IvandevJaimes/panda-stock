# 🤖 AGENTS.md — Reglas Operativas y Guía de Desarrollo para Panda Stock

Este documento define el conjunto de directrices estrictas, convenciones y patrones arquitectónicos que cualquier agente de IA o desarrollador debe seguir en este repositorio. **Estas reglas son de cumplimiento obligatorio y no son negociables.**

---

## 🛡️ 1. Política de Git, Ramas y Commits

### 1.1 Protección de Ramas (`main` y `dev`)

- **`main` es sagrada:** Solo contiene código listo para producción, testeado, estable y versionado. **NUNCA** se commitea directamente en `main`.
- **`dev` es sagrada:** Es la rama de integración activa. **NUNCA** se commitea directamente en `dev`.
- Todo cambio se realiza mediante ramas secundarias desprendidas de `dev` y se integra mediante Pull Request / Merge verificado:
  - `feat/<nombre-en-kebab-case>`: Nuevas funcionalidades (ej: `feat/lector-codigo-barras`, `feat/modal-pin-reportes`).
  - `fix/<nombre-en-kebab-case>`: Correcciones de bugs (ej: `fix/calculo-vuelto-pos`, `fix/ipc-scan-crash`).
  - `refactor/<nombre-en-kebab-case>`: Mejoras internas sin cambio funcional.
  - `chore/<nombre-en-kebab-case>`: Tareas de mantenimiento, dependencias o configuración.

**⚠️ Nunca borres ramas, ni locales ni remotas.** Todas las ramas se conservan permanentemente como historial. No se ejecutan comandos de borrado de ramas (`git branch -d/-D`, `git push origin --delete`, etc.), ni se solicitan confirmaciones para ello.

### 1.2 Convención de Commits (Estrictamente en Español)

Todos los commits deben seguir el estándar de **Conventional Commits traducido al español**, con mensajes concisos, descriptivos y en tiempo presente:

- `feat: <descripción>` — Para nuevas funcionalidades.
- `fix: <descripción>` — Para corrección de errores.
- `refactor: <descripción>` — Para reestructuraciones de código que no corrigen bugs ni agregan funciones.
- `style: <descripción>` — Para cambios estéticos, maquetación Tailwind o formato que no tocan lógica.
- `chore: <descripción>` — Para actualización de scripts, dependencias o tooling.
- `docs: <descripción>` — Para cambios en documentación.

**Ejemplos de commits correctos:**

- `feat(pos): implementar busqueda de productos por multiples codigos de barra`
- `fix(db): resolver transaccion atomica al descontar lotes en ventas`
- `style(reports): agregar modal de desbloqueo con pin en modo oscuro`
- `chore(deps): actualizar esquemas de drizzle-orm para sqlite`

---

## 🎨 2. Reglas de Estilo y UI (Tailwind Únicamente)

- **PROHIBIDO EL CSS PURO / ARCHIVOS `.css` / `.scss`:**
  - No crees archivos `.css`, módulos CSS (`.module.css`), ni etiquetas `<style>` dentro de componentes.
  - El único archivo CSS permitido es el punto de entrada de Tailwind (`src/index.css` o equivalente).
- **TODO con clases utilitarias de Tailwind 4:**
  - Diseña y maqueta exclusivamente mediante clases utilitarias (`flex`, `grid`, `gap-4`, `p-6`, etc.).
  - Si un componente requiere lógica condicional de clases, usa la utilidad canónica `cn()` (`clsx` + `tailwind-merge`).
- **Tokens y Sistema de Diseño:**
  - Color principal (emerald/verde): `#10b981` (usar tokens `primary`).
  - Color secundario (slate oscuro): `#1e2733` (usar tokens `secondary`).
  - Soporte obligatorio para Dark Mode vía clases de Tailwind (`dark:bg-*`, `dark:text-*`, etc.).
  - Fuentes tipográficas: `Nunito Sans` para cuerpo/sans y `Rubik` para encabezados/display (`font-display`).
  - Se mantiene la regla global `user-select: none` para experiencia tipo app de escritorio.

### 2.1 Comentarios en el Código

- **Comentá lo no obvio, nada más.** Un comentario tiene que justificar una decisión o advertir sobre una trampa. Si el código ya lo dice, el comentario es ruido.
- **Prohibido comentar por comentar.** No vale como excusa para describir qué hace la función, aclarar el tipo, ni para narrar un cambio.
- **Sin comentarios que cuenten la historia del código** ("antes era X", "se cambió porque Y", "ya se intentó Z"). Eso es historial de commits, no código.
- **Si un comentario necesita más de unas 4 líneas para explicar una línea de código, la decisión está mal tomada.** Revisá el diseño antes que escribir el comentario.
- **Lo que sí vale la pena:** trampas de CSS o de framework que no se deducen leyendo (containing blocks, orden de cascada, interacciones de `z-index`), invariantes que si se rompen fallan en silencio, y acoplamientos no visibles en el archivo (números que deben coincidir en varios lugares).

---

## 🏛️ 3. Arquitectura del Proyecto y Stack Tecnológico

- **Stack:** Electron 44 + React 19 + TypeScript ~6 + Vite 8 + Tailwind 4 + pnpm.
- **Procesos en Electron (Sandboxing Estricto):**
  - `electron/main.ts`: Proceso principal. Único lugar donde se ejecutan Node.js, `better-sqlite3` y `drizzle-orm`.
  - `electron/preload.ts`: Puente seguro vía `contextBridge`. Expone únicamente las funciones necesarias bajo `window.electronAPI`.
  - `src/`: Proceso de renderizado (React 19). **JAMÁS** intentes importar módulos de Node (`fs`, `path`, `crypto`, `better-sqlite3`) en `src/`.
- **Manejo de Estado Global:**
  - Zustand para el cliente: mantener estados ligeros (`settings.store`, `ui.store`).
  - No dupliques datos del backend SQLite dentro de Zustand; Zustand es para UI y sesión activa de pantalla.
- **Formularios y Validación:**
  - `react-hook-form` junto con esquemas de `zod`.
  - Notificaciones visuales exclusivamente vía `sonner` (`toast.success()`, `toast.error()`).
  - Iconos exclusivamente de `lucide-react`.

---

## 📦 4. Reglas de Base de Datos y Negocio (Panda Stock)

1. **Gestión de Códigos de Barra:**
   - No crees tablas relacionales de variantes para tonos si no es requerido.
   - `productos.codigo_interno` maneja el código corto de mostrador (ej. `111`).
   - `productos.codigos_barras` almacena una lista CSV (ej: `"779001,779002"`).
   - Las consultas de escáner deben usar coincidencia exacta o coincidencia por delimitadores en texto para descontar del stock general.
2. **Precios vs. Costos:**
   - `productos` contiene `precio_venta`.
   - `lotes` contiene el `costo_unitario` histórico inmutable y la fecha de vencimiento de cada tanda de compra.
   - **Regla de mayoreo derivado:** el precio mayorista es universal: a partir de 3 unidades se aplica un 10% de descuento sobre `precio_venta`. **No** se almacena `precio_mayoreo` (columna eliminada); se calcula en el POS al vender (`precioUnitario = precioVenta * 0.9`, `tipoTarifa = 'mayoreo'`).
3. **Seguridad de Reportes:**
   - La validación de reportes se hace por PIN maestro guardado como hash SHA-256 en la fila única de `seguridad_reportes`.
   - No inventes sistemas jerárquicos de roles/permisos complejos salvo indicación explícita.
4. **Inventario Siempre Activo:**
   - Todo artículo físico maneja `stock_actual` y `stock_minimo`. No agregues flags de tipo `usa_inventario` ni campos de `stock_maximo`.

---

## ⚙️ 5. Pautas de Ejecución para Agentes

- **Pnpm obligatorio:** Usa siempre `pnpm` (`pnpm add`, `pnpm dev`, `pnpm build`). No uses `npm` ni `yarn`.
- **TypeScript estricto:** No uses `any` salvo excepciones inevitables en contratos nativos IPC; escribe interfaces explícitas en `src/types/`.
- **No romper funcionalidades existentes:** Verifica las rutas configuradas en `src/app/router.tsx` antes de alterar componentes compartidos.
- **Confirmación antes de cambios destructivos:** No elimines archivos de migración ni limpies bases de datos de prueba sin confirmación explícita.

### Reglas de Ejecución de Terminal y Ahorro de Tokens:

- Siempre que ejecutes comandos de inspección, git, tests o listado de archivos en la shell, utiliza el CLI proxy `rtk` antepuesto si el hook no lo intercepta automáticamente:
  - `rtk git status`, `rtk git diff`, `rtk git log`
  - `rtk pnpm test`, `rtk pnpm build`
  - `rtk find ...`, `rtk ls ...`
- **Búsqueda de código con `tgrep`:** Para encontrar funciones, componentes, imports, referencias, usos de API/variables o explorar el repositorio, utiliza `tgrep "<patrón>" <directorio>` (ej: `tgrep "useEffect" .`) en lugar de `grep`, `rg` o búsquedas manuales. No usar `tgrep` para edición, ejecución o diagnóstico.
- Nunca ejecutes comandos que vuelquen directorios completos como `find .` o `ls -R` sin filtros; limita la búsqueda con `-maxdepth` o herramientas acotadas.
