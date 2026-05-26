import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  getCurrentUser,
  loginWithEmail,
  loginWithGoogleCredential,
  logout,
} from '@/services/auth-service'
import type { SessionUser, ThemePreference } from '@/types/domain'

interface AuthContextValue {
  user: SessionUser | null
  isAuthenticated: boolean
  isLoading: boolean
  loginWithEmail: (email: string, password: string) => Promise<SessionUser>
  loginWithGoogle: (credential: string) => Promise<SessionUser>
  logoutUser: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function applyThemePreference(themePreference: ThemePreference = 'light') {
  document.documentElement.dataset.theme = themePreference
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function boot() {
      try {
        const currentUser = await getCurrentUser()
        setUser(currentUser)
      } catch {
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    void boot()
  }, [])

  useEffect(() => {
    applyThemePreference(user?.themePreference ?? 'light')
  }, [user?.themePreference])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      async loginWithEmail(email, password) {
        const nextUser = await loginWithEmail(email, password)
        setUser(nextUser)
        return nextUser
      },
      async loginWithGoogle(credential) {
        const nextUser = await loginWithGoogleCredential(credential)
        setUser(nextUser)
        return nextUser
      },
      async logoutUser() {
        await logout()
        setUser(null)
      },
      async refreshSession() {
        try {
          const nextUser = await getCurrentUser()
          setUser(nextUser)
        } catch {
          setUser(null)
        }
      },
    }),
    [isLoading, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
