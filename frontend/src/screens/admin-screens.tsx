import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation } from '@tanstack/react-router'

import { Badge, Button, Card, SectionHeading, Textarea } from '@/components/ui'
import {
  deleteUser,
  getAdminGroups,
  getAdminStats,
  getAdminUsers,
  getModerationItems,
  moderateContent,
  toggleBanUser,
} from '@/services/admin-service'

function AdminNav() {
  const location = useLocation()
  const items = [
    ['/admin', 'Dashboard'],
    ['/admin/users', 'Users'],
    ['/admin/groups', 'Groups'],
    ['/admin/moderation', 'Reports'],
    ['/admin/stats', 'Stats'],
  ] as const

  return (
    <Card className="flex flex-wrap gap-2">
      {items.map(([to, label]) => (
        <Button key={to} asChild variant={location.pathname === to ? 'gold' : 'secondary'} size="sm">
          <Link to={to}>{label}</Link>
        </Button>
      ))}
    </Card>
  )
}

function postExcerpt(markdownBlocks: Array<{ markdown: string }>) {
  return markdownBlocks
    .map((block) => block.markdown)
    .join(' ')
    .replace(/\s+/g, ' ')
    .slice(0, 180)
}

export function AdminDashboardScreen() {
  const statsQuery = useQuery({
    queryKey: ['admin-stats'],
    queryFn: getAdminStats,
  })

  const stats = statsQuery.data

  return (
    <div className="space-y-6">
      <AdminNav />
      <SectionHeading
        eyebrow="Admin"
        title="Dashboard platform"
        description="Panel ringkas untuk memantau user, grup, konten, dan submission yang perlu perhatian."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          ['Users', stats?.usersCount ?? 0],
          ['Groups', stats?.groupsCount ?? 0],
          ['Posts', stats?.postsCount ?? 0],
          ['Comments', stats?.commentsCount ?? 0],
          ['Pending submissions', stats?.pendingSubmissionsCount ?? 0],
          ['Unread notifications', stats?.unreadNotificationsCount ?? 0],
        ].map(([label, value]) => (
          <Card key={label} className="space-y-2">
            <p className="text-sm text-ink-500">{label}</p>
            <p className="text-3xl font-semibold text-ink-900">{value}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function AdminUsersScreen() {
  const queryClient = useQueryClient()
  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: getAdminUsers,
  })
  const banMutation = useMutation({
    mutationFn: ({ userId, isBanned }: { userId: string; isBanned: boolean }) =>
      toggleBanUser(userId, isBanned),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })
  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

  return (
    <div className="space-y-6">
      <AdminNav />
      <SectionHeading eyebrow="Admin" title="Kelola user" description="Ban, unban, atau soft delete akun pengguna dari backend nyata." />
      <div className="space-y-4">
        {usersQuery.data?.map((user) => (
          <Card key={user.id} className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <p className="text-base font-semibold text-ink-900">{user.name}</p>
                <p className="text-sm text-ink-500">
                  @{user.username} · {user.email}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="gold">{user.role}</Badge>
                {user.emailVerified ? <Badge variant="success">verified</Badge> : <Badge variant="outline">unverified</Badge>}
                {user.isBanned ? <Badge variant="gold">banned</Badge> : null}
                {user.deletedAt ? <Badge variant="outline">deleted</Badge> : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                onClick={() => banMutation.mutate({ userId: user.id, isBanned: !user.isBanned })}
              >
                {user.isBanned ? 'Unban akun' : 'Ban akun'}
              </Button>
              <Button
                variant="danger"
                disabled={Boolean(user.deletedAt)}
                onClick={() => deleteMutation.mutate(user.id)}
              >
                Hapus akun
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function AdminGroupsScreen() {
  const groupsQuery = useQuery({
    queryKey: ['admin-groups'],
    queryFn: getAdminGroups,
  })

  return (
    <div className="space-y-6">
      <AdminNav />
      <SectionHeading eyebrow="Admin" title="Kelola grup" description="Ringkasan grup public/private yang aktif di platform." />
      <div className="space-y-4">
        {groupsQuery.data?.map((group) => (
          <Card key={group.id} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-ink-900">{group.name}</p>
                <p className="text-sm text-ink-500">{group.description}</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">{group.membersCount} anggota</Badge>
                <Badge variant={group.isPublic ? 'success' : 'gold'}>
                  {group.isPublic ? 'publik' : 'private'}
                </Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function AdminModerationScreen() {
  const [feedback, setFeedback] = useState<Record<string, string>>({})
  const queryClient = useQueryClient()
  const moderationQuery = useQuery({
    queryKey: ['admin-moderation'],
    queryFn: getModerationItems,
  })
  const mutation = useMutation({
    mutationFn: ({ reportId, action, note }: { reportId: string; action: 'take-down' | 'restore' | 'dismiss'; note: string }) =>
      moderateContent(reportId, action, note),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-moderation'] })
      await queryClient.invalidateQueries({ queryKey: ['feed'] })
      await queryClient.invalidateQueries({ queryKey: ['explore'] })
    },
  })

  return (
    <div className="space-y-6">
      <AdminNav />
      <SectionHeading
        eyebrow="Admin"
        title="Report & moderasi konten"
        description="Admin bisa meninjau laporan pengguna, take down postingan, restore, atau dismiss."
      />
      <div className="space-y-4">
        {moderationQuery.data?.map((item) => {
          const note = feedback[item.id] ?? item.moderatorNote ?? item.reason
          const markdownBlocks = item.post.content.filter(
            (block): block is { type: 'markdown'; markdown: string } => block.type === 'markdown',
          )

          return (
            <Card key={item.id} className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold text-ink-900">{item.post.authorName}</p>
                <Badge variant={item.status === 'pending' ? 'gold' : item.status === 'taken_down' ? 'outline' : 'success'}>
                  {item.status}
                </Badge>
                <Badge variant="outline">{item.reporter.name}</Badge>
              </div>
              <p className="text-sm leading-7 text-ink-500">{postExcerpt(markdownBlocks)}</p>
              <p className="text-sm text-ink-600">Alasan report: {item.reason}</p>
              <Textarea
                value={note}
                onChange={(event) => setFeedback((current) => ({ ...current, [item.id]: event.target.value }))}
                placeholder="Catatan moderasi..."
              />
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="gold"
                  onClick={() => mutation.mutate({ reportId: item.id, action: 'take-down', note })}
                >
                  Take down
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => mutation.mutate({ reportId: item.id, action: 'restore', note })}
                >
                  Restore
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => mutation.mutate({ reportId: item.id, action: 'dismiss', note })}
                >
                  Dismiss
                </Button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export function AdminStatsScreen() {
  const statsQuery = useQuery({
    queryKey: ['admin-stats'],
    queryFn: getAdminStats,
  })
  const groupsQuery = useQuery({
    queryKey: ['admin-groups'],
    queryFn: getAdminGroups,
  })

  const distribution = useMemo(
    () =>
      (groupsQuery.data ?? []).map((group) => ({
        label: group.name,
        total: group.membersCount,
      })),
    [groupsQuery.data],
  )

  return (
    <div className="space-y-6">
      <AdminNav />
      <SectionHeading
        eyebrow="Admin"
        title="Statistik ringkas"
        description="View tambahan untuk distribusi grup dan angka inti platform."
      />
      <Card className="space-y-4">
        <p className="text-sm font-semibold text-ink-900">Distribusi anggota per grup</p>
        <div className="space-y-3">
          {distribution.map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-2xl bg-black/4 px-4 py-3">
              <span className="text-sm text-ink-600">{item.label}</span>
              <Badge variant="gold">{item.total} anggota</Badge>
            </div>
          ))}
        </div>
      </Card>
      <Card className="space-y-2">
        <p className="text-sm text-ink-500">Users</p>
        <p className="text-3xl font-semibold text-ink-900">{statsQuery.data?.usersCount ?? 0}</p>
      </Card>
    </div>
  )
}
