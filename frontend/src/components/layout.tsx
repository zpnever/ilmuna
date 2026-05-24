import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import {
  Bell,
  BookOpen,
  Compass,
  Home,
  LayoutDashboard,
  Library,
  LogOut,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/context/auth-context'
import { DEMO_CREDENTIALS } from '@/data/seed'
import { getSuggestedProfiles } from '@/services/profile-service'
import { getFeaturedGroup } from '@/services/group-service'
import { Avatar, Badge, Button, Card, SectionHeading } from '@/components/ui'
import { cn } from '@/lib/utils'

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
}

export function RoleSwitcher() {
  const { user, switchUserRole } = useAuth()
  const roles = [
    { key: 'member', label: 'Member' },
    { key: 'ustadz', label: 'Ustadz' },
    { key: 'admin', label: 'Admin' },
  ] as const

  if (!user) {
    return null
  }

  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-ink-900">Role demo</p>
        <p className="text-xs text-ink-500">Pindah persona tanpa logout untuk menguji route dan hak akses.</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {roles.map((role) => (
          <Button
            key={role.key}
            variant={user.activeRole === role.key ? 'gold' : 'secondary'}
            size="sm"
            onClick={() => void switchUserRole(role.key)}
          >
            {role.label}
          </Button>
        ))}
      </div>
    </Card>
  )
}

const navItems = [
  { to: '/feed', label: 'Feed', icon: Home },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/groups', label: 'Grup', icon: Users },
  { to: '/quran', label: "Al-Qur'an", icon: BookOpen },
  { to: '/hadith', label: 'Hadith', icon: Library },
  { to: '/notifications', label: 'Notifikasi', icon: Bell },
] as const

export function AppFrame({ children }: { children?: ReactNode }) {
  const { user, logoutUser } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const suggestionsQuery = useQuery({
    queryKey: ['suggestions', user?.id],
    queryFn: () => getSuggestedProfiles(user!.id),
    enabled: Boolean(user?.id),
  })
  const featuredGroup = getFeaturedGroup()

  if (!user) {
    return null
  }

  const showAdmin = user.activeRole === 'admin'

  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto grid min-h-screen max-w-[1480px] grid-cols-1 gap-6 px-4 py-4 lg:grid-cols-[240px_minmax(0,1fr)_300px] xl:px-6">
        <aside className="hidden lg:flex lg:flex-col lg:gap-4">
          <Card className="pattern-islamic sticky top-4 overflow-hidden p-0">
            <div className="border-b border-black/8 px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-900 text-lg font-bold text-white">
                  IL
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold-500">Ilmuna</p>
                  <p className="text-sm text-ink-500">Ilmu kita bersama.</p>
                </div>
              </div>
            </div>
            <nav className="space-y-1 px-3 py-4">
              {navItems.map((item) => {
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
            <div className="border-t border-black/8 px-4 py-4">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={async () => {
                  await logoutUser()
                  await navigate({ to: '/login' })
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Keluar
              </Button>
            </div>
          </Card>
        </aside>

        <main className="flex min-w-0 flex-col gap-6 pb-24 lg:pb-8">
          <Card className="pattern-grid overflow-hidden p-0">
            <div className="flex flex-col gap-4 border-b border-black/8 px-5 py-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <Avatar src={user.avatarUrl} fallback={initials(user.name)} className="h-14 w-14" />
                <div>
                  <p className="text-lg font-semibold text-ink-900">{user.name}</p>
                  <p className="text-sm text-ink-500">
                    {user.email} · role aktif <span className="font-semibold text-gold-500">{user.activeRole}</span>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="gold">Demo account</Badge>
                <Badge variant="outline">Email verified</Badge>
              </div>
            </div>
            <div className="grid gap-4 px-5 py-5 md:grid-cols-[1.4fr_1fr]">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-ink-900">Kredensial uji coba</p>
                <div className="rounded-3xl bg-black px-4 py-4 font-mono text-xs text-white sm:text-sm">
                  {DEMO_CREDENTIALS.email}
                  <br />
                  {DEMO_CREDENTIALS.password}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-ink-900">Karakter produk</p>
                <p className="text-sm text-ink-500">
                  Feed hanya dari akun yang diikuti. Konten discovery dipisah ke Explore agar belajar tetap fokus.
                </p>
              </div>
            </div>
          </Card>

          {children}
        </main>

        <aside className="hidden lg:flex lg:flex-col lg:gap-4">
          <RoleSwitcher />

          {featuredGroup ? (
            <Card className="space-y-4">
              <SectionHeading eyebrow="Featured Group" title={featuredGroup.name} />
              <p className="text-sm text-ink-500">{featuredGroup.description}</p>
              <div className="flex flex-wrap gap-2">
                {featuredGroup.tags.map((tag) => (
                  <Badge key={tag} variant="gold">
                    {tag}
                  </Badge>
                ))}
              </div>
              <Button asChild variant="secondary" className="w-full">
                <Link to="/groups/$slug" params={{ slug: featuredGroup.slug }}>
                  Buka grup
                </Link>
              </Button>
            </Card>
          ) : null}

          <Card className="space-y-4">
            <SectionHeading eyebrow="Rekomendasi" title="Akun untuk diikuti" />
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
            <Card className="space-y-4">
              <SectionHeading eyebrow="Admin Mode" title="Panel cepat" />
              <div className="space-y-2">
                <Button asChild variant="secondary" className="w-full justify-start">
                  <Link to="/admin">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="w-full justify-start">
                  <Link to="/admin/moderation">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Moderasi konten
                  </Link>
                </Button>
              </div>
            </Card>
          ) : null}
        </aside>
      </div>

      <nav className="fixed inset-x-4 bottom-4 z-40 rounded-[2rem] border border-black/10 bg-white/95 p-2 shadow-2xl backdrop-blur lg:hidden">
        <div className="grid grid-cols-5 gap-1">
          {navItems.slice(0, 5).map((item) => {
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
        </div>
      </nav>
    </div>
  )
}
