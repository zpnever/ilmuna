import type { ReactNode } from 'react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import {
  BookOpenText,
  Compass,
  Home,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  UserCircle2,
  Users,
} from 'lucide-react'

import {
  Avatar,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  SectionHeading,
} from '@/components/ui'
import { useAuth } from '@/context/auth-context'
import { cn } from '@/lib/utils'
import { getSuggestedProfiles } from '@/services/profile-service'

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
}

const primaryNavItems = [
  { to: '/feed', label: 'Feed', icon: Home },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/groups', label: 'Grup', icon: Users },
  { to: '/references', label: 'Referensi', icon: BookOpenText },
] as const

export function AppFrame({ children }: { children?: ReactNode }) {
  const { user, logoutUser } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [logoutOpen, setLogoutOpen] = useState(false)
  const suggestionsQuery = useQuery({
    queryKey: ['suggestions', user?.id],
    queryFn: () => getSuggestedProfiles(user!.id),
    enabled: Boolean(user?.id),
  })

  if (!user) {
    return null
  }

  const showAdmin = user.role === 'admin'
  const profileMenuActive =
    location.pathname.startsWith('/profile') || location.pathname.startsWith('/settings')

  async function confirmLogout() {
    await logoutUser()
    setLogoutOpen(false)
    await navigate({ to: '/login' })
  }

  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto grid min-h-screen max-w-[1480px] grid-cols-1 gap-6 px-4 py-4 lg:grid-cols-[240px_minmax(0,1fr)_300px] xl:px-6">
        <aside className="hidden lg:flex lg:flex-col lg:gap-4">
          <Card className="sticky top-4 space-y-5">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gold-500">Ilmuna</p>
              <h2 className="text-2xl font-semibold tracking-tight text-ink-900">Belajar, berbagi, bertumbuh.</h2>
            </div>
            <nav className="space-y-1">
              {primaryNavItems.map((item) => {
                const Icon = item.icon
                const active = location.pathname.startsWith(item.to)
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition',
                      active ? 'bg-black text-white shadow-lg shadow-black/10' : 'text-ink-600 hover:bg-black/5',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
              {showAdmin ? (
                <Link
                  to="/admin"
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition',
                    location.pathname.startsWith('/admin')
                      ? 'bg-gold-400 text-black'
                      : 'text-ink-600 hover:bg-gold-400/10',
                  )}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Admin
                </Link>
              ) : null}
            </nav>
          </Card>
        </aside>

        <main className="flex min-w-0 flex-col gap-6 pb-24 lg:pb-8">
          <div className="hidden items-center justify-between rounded-[var(--radius-card)] border border-black/8 bg-white/90 px-5 py-4 shadow-[0_16px_60px_-30px_rgba(0,0,0,0.25)] backdrop-blur lg:flex">
            <div>
              <p className="text-sm text-ink-500">Assalamu'alaikum</p>
              <h1 className="text-lg font-semibold text-ink-900">{user.name}</h1>
            </div>
            <ProfileMenu
              avatarUrl={user.avatarUrl}
              fallback={initials(user.name)}
              name={user.name}
              username={user.username}
              onOpenProfile={() => void navigate({ to: '/profile/$username', params: { username: user.username } })}
              onOpenSettings={() => void navigate({ to: '/settings' })}
              onLogout={() => setLogoutOpen(true)}
            />
          </div>

          {children}
        </main>

        <aside className="hidden lg:flex lg:flex-col lg:gap-4">
          <Card className="space-y-4">
            <SectionHeading eyebrow="Saran follow" title="Perluas lingkar belajar" />
            <div className="space-y-3">
              {suggestionsQuery.data?.map((profile) => (
                <div key={profile.id} className="flex items-center justify-between gap-3 rounded-3xl bg-black/3 p-3">
                  <div className="flex items-center gap-3">
                    <Avatar src={profile.avatarUrl} fallback={initials(profile.name)} />
                    <div>
                      <p className="text-sm font-semibold text-ink-900">{profile.name}</p>
                      <p className="text-xs text-ink-500">@{profile.username}</p>
                    </div>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/profile/$username" params={{ username: profile.username }}>
                      Lihat
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </Card>
          {showAdmin ? (
            <Card className="space-y-3">
              <SectionHeading eyebrow="Admin" title="Akses cepat" />
              <Button asChild variant="secondary" className="w-full justify-start">
                <Link to="/admin">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
              <Button asChild variant="secondary" className="w-full justify-start">
                <Link to="/admin/moderation">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Reports
                </Link>
              </Button>
            </Card>
          ) : null}
        </aside>
      </div>

      <nav className="fixed inset-x-4 bottom-4 z-40 rounded-[2rem] border border-black/10 bg-white/95 p-2 shadow-2xl backdrop-blur lg:hidden">
        <div className="grid grid-cols-5 gap-1">
          {primaryNavItems.map((item) => {
            const Icon = item.icon
            const active = location.pathname.startsWith(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium',
                  active ? 'bg-black text-white' : 'text-ink-500',
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
          <ProfileMenu
            avatarUrl={user.avatarUrl}
            fallback={initials(user.name)}
            name={user.name}
            username={user.username}
            onOpenProfile={() => void navigate({ to: '/profile/$username', params: { username: user.username } })}
            onOpenSettings={() => void navigate({ to: '/settings' })}
            onLogout={() => setLogoutOpen(true)}
            compact
            active={profileMenuActive}
          />
        </div>
      </nav>

      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle className="text-xl font-semibold text-ink-900">Keluar dari Ilmuna?</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-ink-500">
            Sesi Anda akan diakhiri di browser ini.
          </DialogDescription>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setLogoutOpen(false)}>
              Batal
            </Button>
            <Button variant="danger" onClick={() => void confirmLogout()}>
              Keluar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ProfileMenu({
  avatarUrl,
  fallback,
  name,
  username,
  onOpenProfile,
  onOpenSettings,
  onLogout,
  compact = false,
  active = false,
}: {
  avatarUrl: string
  fallback: string
  name: string
  username: string
  onOpenProfile: () => void
  onOpenSettings: () => void
  onLogout: () => void
  compact?: boolean
  active?: boolean
}) {
  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition',
              active ? 'bg-black text-white' : 'text-ink-500',
            )}
          >
            <UserCircle2 className="h-4 w-4" />
            Akun
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="mb-3">
          <DropdownMenuItem onSelect={onOpenProfile} className="p-0">
            <button type="button" className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left">
              <Avatar src={avatarUrl} fallback={fallback} className="h-12 w-12" />
              <div>
                <p className="text-sm font-semibold text-ink-900">{name}</p>
                <p className="text-xs text-ink-500">@{username}</p>
              </div>
            </button>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onOpenSettings}>
            <Settings className="mr-3 h-4 w-4" />
            Pengaturan
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onLogout} className="text-[#991b1b]">
            <LogOut className="mr-3 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-3 rounded-full border border-black/10 bg-white px-2 py-2 text-left transition hover:bg-black/5"
        >
          <Avatar src={avatarUrl} fallback={fallback} className="h-11 w-11" />
          <div className="pr-2">
            <p className="text-sm font-semibold text-ink-900">{name}</p>
            <p className="text-xs text-ink-500">@{username}</p>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onOpenProfile} className="p-0">
          <button type="button" className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left">
            <Avatar src={avatarUrl} fallback={fallback} className="h-12 w-12" />
            <div>
              <p className="text-sm font-semibold text-ink-900">{name}</p>
              <p className="text-xs text-ink-500">@{username}</p>
            </div>
          </button>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onOpenSettings}>
          <Settings className="mr-3 h-4 w-4" />
          Pengaturan
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onLogout} className="text-[#991b1b]">
          <LogOut className="mr-3 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
