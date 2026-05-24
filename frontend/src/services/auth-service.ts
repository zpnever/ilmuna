import { DEMO_CREDENTIALS } from '@/data/seed'
import { delay } from '@/lib/utils'
import { hydrateSessionUser, writeStoredSession } from '@/lib/storage'
import type { SessionUser, UserRole } from '@/types/domain'

export async function loginWithEmail(email: string, password: string) {
  if (email !== DEMO_CREDENTIALS.email || password !== DEMO_CREDENTIALS.password) {
    throw new Error('Email atau password demo tidak cocok.')
  }

  writeStoredSession({
    userId: 'user-demo',
    activeRole: 'member',
  })

  return delay(hydrateSessionUser() as SessionUser, 350)
}

export async function loginWithGoogleStub() {
  writeStoredSession({
    userId: 'user-demo',
    activeRole: 'member',
  })

  return delay(hydrateSessionUser() as SessionUser, 350)
}

export async function logout() {
  writeStoredSession(null)
  return delay(true, 100)
}

export async function switchRole(role: UserRole) {
  const session = hydrateSessionUser()
  if (!session) {
    throw new Error('Tidak ada sesi yang aktif.')
  }

  writeStoredSession({
    userId: session.id,
    activeRole: role,
  })

  return delay(hydrateSessionUser() as SessionUser, 100)
}

export function getSessionUserSync() {
  return hydrateSessionUser()
}
