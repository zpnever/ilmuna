import { createSeedDatabase } from '@/data/seed'
import { isBrowser } from '@/lib/utils'
import type { DemoDatabase, SessionUser, UserRole } from '@/types/domain'

const DB_KEY = 'ilmuna-demo-db'
const SESSION_KEY = 'ilmuna-demo-session'
const DB_VERSION_KEY = 'ilmuna-demo-db-version'
const DB_VERSION = '2026-05-24-public-assets-v1'

interface StoredSession {
  userId: string
  activeRole: UserRole
}

export function readDatabase(): DemoDatabase {
  if (!isBrowser()) {
    return createSeedDatabase()
  }

  const currentVersion = window.localStorage.getItem(DB_VERSION_KEY)
  const raw = window.localStorage.getItem(DB_KEY)
  if (!raw || currentVersion !== DB_VERSION) {
    const seeded = createSeedDatabase()
    window.localStorage.setItem(DB_KEY, JSON.stringify(seeded))
    window.localStorage.setItem(DB_VERSION_KEY, DB_VERSION)
    return seeded
  }

  return JSON.parse(raw) as DemoDatabase
}

export function writeDatabase(database: DemoDatabase) {
  if (!isBrowser()) {
    return
  }

  window.localStorage.setItem(DB_KEY, JSON.stringify(database))
  window.localStorage.setItem(DB_VERSION_KEY, DB_VERSION)
}

export function updateDatabase(updater: (database: DemoDatabase) => DemoDatabase) {
  const next = updater(readDatabase())
  writeDatabase(next)
  return next
}

export function readStoredSession() {
  if (!isBrowser()) {
    return null
  }

  const raw = window.localStorage.getItem(SESSION_KEY)
  if (!raw) {
    return null
  }

  return JSON.parse(raw) as StoredSession
}

export function writeStoredSession(session: StoredSession | null) {
  if (!isBrowser()) {
    return
  }

  if (!session) {
    window.localStorage.removeItem(SESSION_KEY)
    return
  }

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function hydrateSessionUser(): SessionUser | null {
  const session = readStoredSession()
  if (!session) {
    return null
  }

  const database = readDatabase()
  const user = database.users.find((entry) => entry.id === session.userId)
  if (!user) {
    return null
  }

  return {
    ...user,
    activeRole: session.activeRole,
  }
}
