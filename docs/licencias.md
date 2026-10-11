# Licencias offline

Panda Stock usa licencias perpetuas firmadas con Ed25519 y ligadas a un equipo. La validación corre en el proceso principal de Electron, tanto al iniciar como al consultar el estado. El renderer solo muestra el resultado. No hay activación online ni periodo de prueba.

El archivo se guarda en `app.getPath('userData')/licencia/licencia.lic`, dentro de una carpeta exclusiva con permisos restrictivos. Electron ubica `userData` bajo la configuración de la app en Linux (`~/.config`) y en `AppData` en Windows.

## ID de equipo

La pantalla de activación muestra un ID Base64 URL de 43 caracteres para que el cliente lo pueda copiar y enviar. Es una codificación compacta de los 32 bytes completos de SHA-256; conserva los 256 bits de la huella. El ID se calcula sobre `panda-stock-hw-v1:<identificador nativo>`.

Si el sistema operativo no ofrece una fuente de hardware compatible, Panda Stock crea `userData/licencia/instalacion-id` y muestra una advertencia. Esa identidad se conserva en la instalación actual; antes de reinstalar o migrar el perfil hay que consultar con soporte.

## Crear y proteger las claves

Generá el par en la máquina de emisión. La clave privada nunca se guarda en este repositorio, en `dist*` ni en el instalador:

```sh
mkdir -p ~/.panda-stock-keys
chmod 700 ~/.panda-stock-keys
openssl genpkey -algorithm Ed25519 -out ~/.panda-stock-keys/private.pem
openssl pkey -in ~/.panda-stock-keys/private.pem -pubout -out ~/.panda-stock-keys/public.pem
chmod 600 ~/.panda-stock-keys/private.pem
```

Copiá el contenido de `public.pem` como una entrada nueva de `LICENCIA_PUBLIC_KEYS` en `electron/licencia/keys.ts`. La aplicación solo contiene claves públicas. Protegé la privada con acceso restringido y una copia segura fuera del equipo de emisión.

## Emitir una licencia

Solicitá al cliente el ID de equipo que aparece en la pantalla de activación. Ejecutá el emisor desde una carpeta privada fuera del repositorio; el script rechaza la ejecución desde el proyecto y cualquier clave o salida ubicada dentro de él:

```sh
cd ~/.panda-stock-keys
node /ruta/al/proyecto/panda-stock/scripts/generar-licencia.mjs --huella ID_DE_EQUIPO --licenciado "Nombre del cliente"
```

Por defecto, el script lee `~/.panda-stock-keys/private.pem` y guarda el archivo en `~/.panda-stock-keys/licencias/<id>.lic`. Se pueden indicar `--key` y `--out`, ambos fuera del repositorio. El archivo JSON contiene `venceEn: null`; el emisor no admite vencimientos. Enviá el `.lic` al cliente para que lo pegue en la pantalla de activación. La clave privada es el único material que permite emitir licencias válidas y nunca debe compartirse.

La firma cubre un JSON canónico con orden fijo y el dominio `panda-stock-licencia-v1:`. Una licencia alterada, firmada con otra clave o emitida para otra huella se rechaza. La licencia es perpetua y no depende de la fecha del equipo.

## Rotación de claves

Para cambiar la clave emisora, agregá la nueva clave pública a `LICENCIA_PUBLIC_KEYS` y emití licencias con su privada. Conservá las claves públicas anteriores para que las licencias existentes sigan funcionando. Quitar una clave pública revoca todas las licencias firmadas con su privada; los clientes afectados necesitarán recibir una licencia nueva.

## Protección del código de Electron

El build de producción minifica `main` y `preload` con Rolldown y mantiene el preload en CommonJS. No se integra `javascript-obfuscator`: los plugins encontrados declaran compatibilidad con Rollup, pero esta configuración de Vite 8 ejecuta Rolldown y usa una salida CJS sandboxed; no hay compatibilidad verificada que permita añadirlo sin arriesgar el build. La minificación dificulta la lectura casual, pero la protección de licencias depende de la firma y de mantener la clave privada fuera del producto.
