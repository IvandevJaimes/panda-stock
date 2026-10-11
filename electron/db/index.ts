import { existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import path from 'node:path'
import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { eq } from 'drizzle-orm'
import * as schema from './schema.ts'

const require = createRequire(import.meta.url)
const app = (require('electron') as { app?: { getPath(name: string): string } }).app

let sqlite: Database.Database | null = null
let database: BetterSQLite3Database<typeof schema> | null = null

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!database) {
    throw new Error('Base de datos no inicializada. Ejecuta initDatabase() primero.')
  }
  return database
}

export function getDbPath(): string {
  if (process.env.PANDA_STOCK_DB) return process.env.PANDA_STOCK_DB
  if (!app?.getPath) return path.join(process.cwd(), 'data', 'panda_stock.db')
  return path.join(app.getPath('userData'), 'panda_stock.db')
}

export function initDatabase(): void {
  if (sqlite) return

  const dbPath = getDbPath()
  const migrationsCandidates = [
    path.join(import.meta.dirname, '../electron/db/migrations'),
    path.join(import.meta.dirname, 'migrations'),
  ]
  const migrationsFolder = migrationsCandidates.find((candidate) =>
    existsSync(path.join(candidate, 'meta/_journal.json')),
  )

  if (!migrationsFolder) {
    throw new Error(
      `No se encontró el historial de migraciones. Se buscaron: ${migrationsCandidates.join(', ')}`,
    )
  }

  const connection = new Database(dbPath)

  try {
    connection.pragma('journal_mode = WAL')
    connection.pragma('foreign_keys = ON')

    const db = drizzle(connection, { schema })
    migrate(db, { migrationsFolder })

    const ahora = new Date().toISOString()
    const seguridadExistente = db
      .select({ id: schema.seguridad.id })
      .from(schema.seguridad)
      .where(eq(schema.seguridad.id, 1))
      .get()

    if (!seguridadExistente) {
      db.insert(schema.seguridad).values({ id: 1, actualizadoEn: ahora }).run()
    }

    const seguridadActual = db
      .select({ recoveryId: schema.seguridad.recoveryId })
      .from(schema.seguridad)
      .where(eq(schema.seguridad.id, 1))
      .get()
    if (seguridadActual && !seguridadActual.recoveryId) {
      db.update(schema.seguridad)
        .set({ recoveryId: randomUUID() })
        .where(eq(schema.seguridad.id, 1))
        .run()
    }

    const negocioExistente = db
      .select({ id: schema.negocio.id })
      .from(schema.negocio)
      .where(eq(schema.negocio.id, 1))
      .get()

    if (!negocioExistente) {
      db.insert(schema.negocio)
        .values({ id: 1, nombre: null, logoPath: null, creadoEn: null, actualizadoEn: ahora })
        .run()
    }

    sqlite = connection
    database = db
  } catch (error) {
    try {
      connection.close()
    } catch {
      // Preservar el error de migración o inicialización.
    }
    const detalle = error instanceof Error ? error.message : String(error)
    throw new Error(`No se pudo inicializar la base de datos "${dbPath}": ${detalle}`, {
      cause: error,
    })
  }
}
