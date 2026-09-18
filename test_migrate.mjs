import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

const dbPath = process.env.DB_PATH
if (!dbPath) throw new Error('falta DB_PATH')

const sqlite = new Database(dbPath)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')
const db = drizzle(sqlite)
migrate(db, { migrationsFolder: './electron/db/migrations' })
console.log('MIGRATION OK')

const t = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()
console.log('tablas:', t.map((r) => r.name).join(', '))
sqlite.close()