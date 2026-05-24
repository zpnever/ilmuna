import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation } from '@tanstack/react-router'

import { Badge, Button, Card, SectionHeading, Textarea } from '@/components/ui'
import { getAdminGroups, getAdminStats, getAdminUsers, getModerationItems, moderateContent } from '@/services/admin-service'
import { readDatabase } from '@/lib/storage'
import { stripHtml } from '@/lib/utils'

function AdminNav() {
  const location = useLocation()
  const items = [
    ['/admin', 'Dashboard'],
    ['/admin/users', 'Users'],
    ['/admin/groups', 'Groups'],
    ['/admin/moderation', 'Moderation'],
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
  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: getAdminUsers,
  })

  return (
    <div className="space-y-6">
      <AdminNav />
      <SectionHeading eyebrow="Admin" title="Kelola user" description="Daftar pengguna dummy lengkap dengan role dan status verifikasi." />
      <div className="space-y-4">
        {usersQuery.data?.map((user) => (
          <Card key={user.id} className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-base font-semibold text-ink-900">{user.name}</p>
              <p className="text-sm text-ink-500">
                @{user.username} · {user.email}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="gold">{user.role}</Badge>
              {user.emailVerified ? <Badge variant="success">verified</Badge> : <Badge variant="outline">unverified</Badge>}
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
      <SectionHeading eyebrow="Admin" title="Kelola grup" description="Ringkasan grup dummy yang aktif di platform." />
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
    mutationFn: ({ postId, status, reason }: { postId: string; status: 'visible' | 'hidden'; reason: string }) =>
      moderateContent(postId, status, reason),
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
        title="Moderasi konten"
        description="Dummy moderation state memengaruhi apakah sebuah post tampil di feed dan explore."
      />
      <div className="space-y-4">
        {moderationQuery.data?.map((item) => (
          <Card key={item.postId} className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-semibold text-ink-900">{item.author?.name}</p>
              <Badge variant={item.status === 'visible' ? 'success' : 'gold'}>{item.status}</Badge>
            </div>
            <p className="text-sm leading-7 text-ink-500">
              {stripHtml(item.post?.content.find((block) => block.type === 'richText')?.html ?? '')}
            </p>
            <Textarea
              value={feedback[item.postId] ?? item.reason}
              onChange={(event) => setFeedback((current) => ({ ...current, [item.postId]: event.target.value }))}
              placeholder="Catatan moderasi..."
            />
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() =>
                  mutation.mutate({
                    postId: item.postId,
                    status: 'visible',
                    reason: feedback[item.postId] ?? item.reason,
                  })
                }
              >
                Jadikan visible
              </Button>
              <Button
                variant="gold"
                onClick={() =>
                  mutation.mutate({
                    postId: item.postId,
                    status: 'hidden',
                    reason: feedback[item.postId] ?? item.reason,
                  })
                }
              >
                Sembunyikan
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function AdminStatsScreen() {
  const statsQuery = useQuery({
    queryKey: ['admin-stats'],
    queryFn: getAdminStats,
  })

  const database = readDatabase()
  const topAuthors = database.posts.reduce<Record<string, number>>((acc, post) => {
    acc[post.authorId] = (acc[post.authorId] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <AdminNav />
      <SectionHeading
        eyebrow="Admin"
        title="Statistik ringkas"
        description="View tambahan untuk angka dan distribusi sederhana di mode dummy."
      />
      <Card className="space-y-4">
        <p className="text-sm font-semibold text-ink-900">Distribusi author</p>
        <div className="space-y-3">
          {Object.entries(topAuthors).map(([authorId, total]) => (
            <div key={authorId} className="flex items-center justify-between rounded-2xl bg-black/4 px-4 py-3">
              <span className="text-sm text-ink-600">{database.users.find((entry) => entry.id === authorId)?.name}</span>
              <Badge variant="gold">{total} post</Badge>
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
