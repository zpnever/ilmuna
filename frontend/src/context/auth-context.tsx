import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  getSessionUserSync,
  loginWithEmail,
  loginWithGoogleStub,
  logout,
  switchRole,
} from '@/services/auth-service'
import type { SessionUser, UserRole } from '@/types/domain'

interface AuthContextValue {
  user: SessionUser | null
  isAuthenticated: boolean
  login: typeof loginWithEmail
  loginWithGoogle: typeof loginWithGoogleStub
  logoutUser: () => Promise<void>
  switchUserRole: (role: UserRole) => Promise<void>
  refreshSession: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<SessionUser | null>(() => getSessionUserSync())

  useEffect(() => {
    function handleStorage() {
      setUser(getSessionUserSync())
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      async login(email, password) {
        const nextUser = await loginWithEmail(email, password)
        setUser(nextUser)
        return nextUser
      },
      async loginWithGoogle() {
        const nextUser = await loginWithGoogleStub()
        setUser(nextUser)
        return nextUser
      },
      async logoutUser() {
        await logout()
        setUser(null)
      },
      async switchUserRole(role) {
        const nextUser = await switchRole(role)
        setUser(nextUser)
      },
      refreshSession() {
        setUser(getSessionUserSync())
      },
    }),
    [user],
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
