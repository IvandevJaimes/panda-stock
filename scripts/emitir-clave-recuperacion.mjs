import { readFileSync } from 'node:fs'
import { sign } from 'node:crypto'

const [recoveryId, privateKeyPath] = process.argv.slice(2)

if (!recoveryId || !privateKeyPath) {
  process.stderr.write('Uso: node scripts/emitir-clave-recuperacion.mjs <código-de-instalación> <ruta-clave-privada.pem>\n')
  process.exitCode = 1
} else {
  const privateKey = readFileSync(privateKeyPath, 'utf8')
  const mensaje = Buffer.from(`panda-stock-recovery-v1:${recoveryId}`)
  process.stdout.write(`${sign(null, mensaje, privateKey).toString('base64url')}\n`)
}
