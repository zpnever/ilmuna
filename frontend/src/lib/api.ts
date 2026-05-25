import type { SessionUser } from '@/types/domain'
import { env } from '@/lib/env'

let refreshPromise: Promise<string | null> | null = null
let accessToken: string | null = null

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function setAccessToken(token: string | null) {
  accessToken = token
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text()
  const data = text ? (JSON.parse(text) as unknown) : null

  if (!response.ok) {
    const message =
      typeof data === 'object' && data && 'message' in data && typeof data.message === 'string'
        ? data.message
        : 'Terjadi kesalahan saat menghubungi server.'
    throw new ApiError(response.status, message)
  }

  return data as T
}

export async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${env.apiUrl}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then((response) => parseResponse<{ user: SessionUser; accessToken: string }>(response))
      .then((payload) => {
        setAccessToken(payload.accessToken)
        return payload.accessToken
      })
      .catch((error) => {
        setAccessToken(null)
        throw error
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  retryOnAuthError = true,
): Promise<T> {
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }

  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  const response = await fetch(`${env.apiUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  })

  if (response.status === 401 && retryOnAuthError) {
    try {
      const nextToken = await refreshAccessToken()
      if (!nextToken) {
        throw new ApiError(401, 'Sesi berakhir.')
      }

      const retryHeaders = new Headers(init.headers)
      if (!retryHeaders.has('Content-Type') && init.body) {
        retryHeaders.set('Content-Type', 'application/json')
      }
      retryHeaders.set('Authorization', `Bearer ${nextToken}`)

      const retryResponse = await fetch(`${env.apiUrl}${path}`, {
        ...init,
        credentials: 'include',
        headers: retryHeaders,
      })

      return parseResponse<T>(retryResponse)
    } catch (error) {
      setAccessToken(null)
      throw error
    }
  }

  return parseResponse<T>(response)
}
