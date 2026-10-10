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
  sqlite = new Database(dbPath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  database = drizzle(sqlite, { schema })

  const migrationsBundled = path.join(import.meta.dirname, '../electron/db/migrations')
  const migrationsFuente = path.join(import.meta.dirname, 'migrations')
  const migrationsFolder = existsSync(migrationsBundled) ? migrationsBundled : migrationsFuente

  migrate(database, { migrationsFolder })

  const ahora = new Date().toISOString()
  const seguridadExistente = database
    .select({ id: schema.seguridad.id })
    .from(schema.seguridad)
    .where(eq(schema.seguridad.id, 1))
    .get()

  if (!seguridadExistente) {
    database.insert(schema.seguridad).values({ id: 1, actualizadoEn: ahora }).run()
  }

  const seguridadActual = database
    .select({ recoveryId: schema.seguridad.recoveryId })
    .from(schema.seguridad)
    .where(eq(schema.seguridad.id, 1))
    .get()
  if (seguridadActual && !seguridadActual.recoveryId) {
    database.update(schema.seguridad)
      .set({ recoveryId: randomUUID() })
      .where(eq(schema.seguridad.id, 1))
      .run()
  }

  const negocioExistente = database
    .select({ id: schema.negocio.id })
    .from(schema.negocio)
    .where(eq(schema.negocio.id, 1))
    .get()

  if (!negocioExistente) {
    database
      .insert(schema.negocio)
      .values({ id: 1, nombre: null, logoPath: null, creadoEn: null, actualizadoEn: ahora })
      .run()
  }
}
