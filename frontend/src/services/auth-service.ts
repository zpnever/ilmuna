import {
  apiRequest,
  setAccessToken,
} from '@/lib/api'
import type { SessionUser, UserRole } from '@/types/domain'

interface AuthPayload {
  user: SessionUser
  accessToken: string
  message?: string
}

let sessionUser: SessionUser | null = null
let ensureSessionPromise: Promise<SessionUser | null> | null = null

function withActiveRole(user: SessionUser): SessionUser {
  return {
    ...user,
    activeRole: user.activeRole ?? user.role,
  }
}

export async function loginWithEmail(email: string, password: string) {
  const payload = await apiRequest<AuthPayload>(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    },
    false,
  )

  const user = withActiveRole(payload.user)
  setAccessToken(payload.accessToken)
  sessionUser = user
  return user
}

export async function loginWithGoogleCredential(credential: string) {
  const payload = await apiRequest<AuthPayload>(
    '/auth/google',
    {
      method: 'POST',
      body: JSON.stringify({ credential }),
    },
    false,
  )

  const user = withActiveRole(payload.user)
  setAccessToken(payload.accessToken)
  sessionUser = user
  return user
}

export async function logout() {
  try {
    await apiRequest<{ ok: boolean }>('/auth/logout', {
      method: 'POST',
    })
  } finally {
    setAccessToken(null)
    sessionUser = null
  }
}

export async function switchRole(role: UserRole) {
  return role
}

export async function getCurrentUser() {
  const payload = await apiRequest<{ user: SessionUser }>('/auth/me')
  const user = withActiveRole(payload.user)
  sessionUser = user
  return user
}

export async function ensureSession() {
  if (sessionUser) {
    return sessionUser
  }

  if (!ensureSessionPromise) {
    ensureSessionPromise = getCurrentUser()
      .catch(() => null)
      .finally(() => {
        ensureSessionPromise = null
      })
  }

  return ensureSessionPromise
}

export function getSessionUserSync(): SessionUser | null {
  return sessionUser
}
