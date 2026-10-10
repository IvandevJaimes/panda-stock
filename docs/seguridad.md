# Seguridad por contraseña

La contraseña y sus protecciones se guardan en la base SQLite local. Zustand conserva únicamente una copia de presentación hidratada por IPC; editar `localStorage` no cambia las decisiones del proceso principal. Las operaciones sensibles verifican la protección y el PIN en el proceso principal antes de tocar los datos.

## Almacenamiento y migración

Las contraseñas nuevas usan `scrypt` con parámetros `N=32768`, `r=8`, `p=1`, un salt aleatorio de 16 bytes y una salida de 64 bytes. El registro se guarda con el formato versionado `scrypt$N$r$p$salt$hash`. Los hashes SHA-256 existentes se aceptan solo para comprobar la contraseña; si coincide, se reemplazan por un hash scrypt. La columna `password_configured` indica explícitamente si hay contraseña, por lo que `1234` es un valor válido.

Las protecciones antiguas de `localStorage` se envían una vez al proceso principal para inicializar la configuración DB. Desde esa inicialización, SQLite es la única fuente de verdad. La migración mantiene el hash de contraseña anterior y elimina los campos de seguridad que no tenían uso.

## Intentos y autorización

Cinco verificaciones fallidas bloquean nuevos intentos durante 30 segundos. Cada bloqueo posterior duplica la duración hasta un máximo de 15 minutos. El contador, el nivel y el vencimiento se guardan en SQLite; una verificación correcta reinicia los tres valores.

Los accesos a reportes y cuentas corrientes se conceden en memoria por `webContents` después de validar el PIN. Se limpian al iniciar una navegación de documento y cuando cambia la configuración de seguridad. Las operaciones de borrado, anulación y devolución verifican el PIN recibido en la misma llamada que modifica los datos.

Esta barrera controla las operaciones que pasan por Panda Stock. No cifra el archivo SQLite: una persona con acceso al perfil del sistema operativo puede modificar o reemplazar la base fuera de la aplicación.

## Recuperación

La base guarda un identificador aleatorio por instalación. La pantalla de recuperación lo muestra para que el cliente lo comparta con soporte. El operador firma ese identificador con una clave privada Ed25519 y le entrega el código resultante; Panda Stock verifica la firma con una clave pública incluida en el proceso principal y permite definir una contraseña nueva. El identificador cambia después de cada recuperación, así que el código queda invalidado al usarse.

La clave privada de firma nunca se incluye en el repositorio ni en el instalador. Para emitir un código, el operador conserva su archivo PEM fuera de la carpeta del proyecto y ejecuta:

```sh
node scripts/emitir-clave-recuperacion.mjs <código-de-instalación> <ruta-segura-a-clave-privada.pem>
```

La clave privada debe respaldarse en un lugar seguro. Perderla impide emitir nuevos códigos. Si se rota, hay que actualizar la clave pública en `electron/db/security.ts` y distribuir una versión nueva; la firma no permite recuperar la contraseña anterior, solo reemplazarla.
