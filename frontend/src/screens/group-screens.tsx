import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Badge, Button, Card, EmptyState, Input, SectionHeading, Textarea } from '@/components/ui'
import { useAuth } from '@/context/auth-context'
import {
  createGroup,
  createGroupPost,
  createSubmission,
  getGroupDetail,
  getGroupJoinRequests,
  getGroupMaterials,
  getGroups,
  getGroupTaskDetail,
  getGroupTasks,
  kickGroupMember,
  leaveGroup,
  requestJoinGroup,
  reviewSubmission,
  reviewJoinRequest,
  updateGroup,
  updateGroupMemberRole,
} from '@/services/group-service'
import { formatLongDate, relativeTime } from '@/lib/utils'

function GroupTopNav({ slug, active }: { slug: string; active: 'forum' | 'materials' | 'tasks' | 'settings' }) {
  const items = [
    { to: '/groups/$slug', label: 'Forum', key: 'forum' },
    { to: '/groups/$slug/materials', label: 'Materi', key: 'materials' },
    { to: '/groups/$slug/tasks', label: 'Tugas', key: 'tasks' },
    { to: '/groups/$slug/settings', label: 'Pengaturan', key: 'settings' },
  ] as const

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Button
          key={item.key}
          asChild
          variant={active === item.key ? 'primary' : 'secondary'}
          size="sm"
        >
          <Link to={item.to} params={{ slug }}>
            {item.label}
          </Link>
        </Button>
      ))}
    </div>
  )
}

export function GroupsScreen() {
  const queryClient = useQueryClient()
  const groupsQuery = useQuery({
    queryKey: ['groups'],
    queryFn: getGroups,
  })
  const joinMutation = useMutation({
    mutationFn: (slug: string) => requestJoinGroup(slug),
    onSuccess: async () => {
      toast.success('Permintaan diproses.')
      await queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
  })

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Komunitas"
        title="Grup pengajian"
        description="Klik grup untuk masuk ke ruang komunitas, materi, dan tugasnya."
        action={
          <Button asChild>
            <Link to="/groups/create">
              <Plus className="mr-2 h-4 w-4" />
              Buat Grup
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 xl:grid-cols-2">
        {groupsQuery.data?.map((group) => (
          <Card key={group.id} className="overflow-hidden p-0">
            <Link to="/groups/$slug" params={{ slug: group.slug }} className="block">
              <div className="h-40 bg-cover bg-center" style={{ backgroundImage: `url(${group.coverUrl})` }} />
              <div className="space-y-4 px-5 py-5">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-ink-900">{group.name}</h2>
                    <Badge variant={group.isPublic ? 'success' : 'outline'}>
                      {group.isPublic ? 'Publik' : 'Private'}
                    </Badge>
                    {group.membershipStatus === 'member' ? <Badge variant="gold">Anggota</Badge> : null}
                    {group.joinRequestStatus ? <Badge variant="outline">{group.joinRequestStatus}</Badge> : null}
                  </div>
                  <p className="text-sm leading-7 text-ink-500">{group.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.tags.map((tag) => (
                    <Badge key={tag} variant="gold">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </Link>
            {group.membershipStatus !== 'member' ? (
              <div className="px-5 pb-5">
                <Button
                  className="w-full"
                  variant={group.isPublic ? 'primary' : 'secondary'}
                  disabled={joinMutation.isPending || group.joinRequestStatus === 'pending'}
                  onClick={() => joinMutation.mutate(group.slug)}
                >
                  {group.isPublic ? 'Gabung sekarang' : 'Ajukan bergabung'}
                </Button>
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  )
}

export function CreateGroupScreen() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [coverUrl, setCoverUrl] = useState('')
  const [tags, setTags] = useState('')
  const mutation = useMutation({
    mutationFn: () =>
      createGroup({
        name,
        slug,
        description,
        visibility,
        coverUrl,
        tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      }),
    onSuccess: async (group) => {
      toast.success('Grup berhasil dibuat.')
      await navigate({ to: '/groups/$slug', params: { slug: group.slug } })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="Grup baru" title="Buat komunitas Anda" />
      <Card className="space-y-4">
        <label className="space-y-2 text-sm font-medium text-ink-700">
          <span>Nama grup</span>
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="space-y-2 text-sm font-medium text-ink-700">
          <span>Slug</span>
          <Input value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/\s+/g, '-'))} />
        </label>
        <label className="space-y-2 text-sm font-medium text-ink-700">
          <span>Deskripsi</span>
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} className="rounded-[1.5rem] focus:border-black/8 focus:ring-0" />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-ink-700">
            <span>Visibilitas</span>
            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as 'public' | 'private')}
              className="flex h-11 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none"
            >
              <option value="public">Publik</option>
              <option value="private">Private</option>
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-ink-700">
            <span>Cover URL</span>
            <Input value={coverUrl} onChange={(event) => setCoverUrl(event.target.value)} />
          </label>
        </div>
        <label className="space-y-2 text-sm font-medium text-ink-700">
          <span>Tag</span>
          <Input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="tajwid, keluarga, sirah" />
        </label>
        <div className="flex justify-end">
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            Buat grup
          </Button>
        </div>
      </Card>
    </div>
  )
}

export function GroupDetailScreen() {
  const { user } = useAuth()
  const { slug } = useParams({ from: '/groups/$slug' })
  const queryClient = useQueryClient()
  const [postDraft, setPostDraft] = useState('')
  const detailQuery = useQuery({
    queryKey: ['group', slug],
    queryFn: () => getGroupDetail(slug),
    enabled: Boolean(user),
  })
  const createPostMutation = useMutation({
    mutationFn: () => createGroupPost(slug, postDraft),
    onSuccess: async () => {
      setPostDraft('')
      await queryClient.invalidateQueries({ queryKey: ['group', slug] })
      toast.success('Postingan grup dikirim.')
    },
  })

  if (!user || !detailQuery.data) {
    return null
  }

  const { group, members } = detailQuery.data
  const canView = group.isPublic || group.membershipStatus === 'member'

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-0">
        <div className="h-44 bg-cover bg-center" style={{ backgroundImage: `url(${group.coverUrl})` }} />
        <div className="space-y-4 px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-semibold text-ink-900">{group.name}</h1>
                <Badge variant={group.isPublic ? 'success' : 'outline'}>
                  {group.isPublic ? 'Publik' : 'Private'}
                </Badge>
                {group.viewerRole ? <Badge variant="gold">{group.viewerRole}</Badge> : null}
              </div>
              <p className="max-w-3xl text-sm leading-7 text-ink-500">{group.description}</p>
              <p className="text-sm text-ink-400">{members.length} anggota</p>
            </div>
            <GroupTopNav slug={slug} active="forum" />
          </div>
        </div>
      </Card>

      {!canView ? (
        <EmptyState
          title="Forum internal hanya untuk anggota"
          description="Ajukan bergabung untuk melihat diskusi grup private ini."
        />
      ) : (
        <>
          {group.membershipStatus === 'member' ? (
            <Card className="space-y-3">
              <Textarea
                value={postDraft}
                onChange={(event) => setPostDraft(event.target.value)}
                placeholder="Tulis diskusi untuk anggota grup..."
                className="rounded-[1.5rem] focus:border-black/8 focus:ring-0"
              />
              <div className="flex justify-end">
                <Button disabled={!postDraft.trim() || createPostMutation.isPending} onClick={() => createPostMutation.mutate()}>
                  Kirim ke forum
                </Button>
              </div>
            </Card>
          ) : null}

          <div className="space-y-4">
            {group.forumPosts.length ? (
              group.forumPosts.map((post) => (
                <Card key={post.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink-900">{post.authorName ?? 'Anggota grup'}</p>
                      <p className="text-xs text-ink-400">{relativeTime(post.createdAt)}</p>
                    </div>
                  </div>
                  <p className="text-sm leading-7 text-ink-600">{post.content}</p>
                </Card>
              ))
            ) : (
              <EmptyState title="Belum ada diskusi" description="Mulai percakapan pertama di grup ini." />
            )}
          </div>
        </>
      )}
    </div>
  )
}

export function GroupMaterialsScreen() {
  const { user } = useAuth()
  const { slug } = useParams({ from: '/groups/$slug/materials' })
  const detailQuery = useQuery({
    queryKey: ['group', slug],
    queryFn: () => getGroupDetail(slug),
    enabled: Boolean(user),
  })
  const materialsQuery = useQuery({
    queryKey: ['group-materials', slug],
    queryFn: () => getGroupMaterials(slug),
    enabled: Boolean(user),
  })

  if (!user || !detailQuery.data) {
    return null
  }

  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="Materi" title={detailQuery.data.group.name} action={<GroupTopNav slug={slug} active="materials" />} />
      {materialsQuery.data?.length ? (
        <div className="space-y-4">
          {materialsQuery.data.map((material) => (
            <Card key={material.id} className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-ink-900">{material.title}</h2>
                <Badge variant="outline">{material.type}</Badge>
              </div>
              <p className="text-sm leading-7 text-ink-600">{material.description}</p>
              {material.resourceUrl ? (
                <Button asChild variant="secondary" size="sm">
                  <a href={material.resourceUrl} target="_blank" rel="noreferrer">
                    Buka materi
                  </a>
                </Button>
              ) : null}
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="Belum ada materi" description="Materi grup akan tampil di sini." />
      )}
    </div>
  )
}

export function GroupTasksScreen() {
  const { user } = useAuth()
  const { slug } = useParams({ from: '/groups/$slug/tasks' })
  const detailQuery = useQuery({
    queryKey: ['group', slug],
    queryFn: () => getGroupDetail(slug),
    enabled: Boolean(user),
  })
  const tasksQuery = useQuery({
    queryKey: ['group-tasks', slug],
    queryFn: () => getGroupTasks(slug),
    enabled: Boolean(user),
  })

  if (!user || !detailQuery.data) {
    return null
  }

  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="Tugas" title={detailQuery.data.group.name} action={<GroupTopNav slug={slug} active="tasks" />} />
      {tasksQuery.data?.length ? (
        <div className="space-y-4">
          {tasksQuery.data.map((task) => (
            <Card key={task.id} className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-ink-900">{task.title}</h2>
                <Badge variant="gold">{task.type}</Badge>
              </div>
              <p className="text-sm leading-7 text-ink-600">{task.description}</p>
              <p className="text-xs text-ink-400">Deadline {formatLongDate(task.dueDate)}</p>
              <Button asChild variant="secondary">
                <Link to="/groups/$slug/tasks/$taskId" params={{ slug, taskId: task.id }}>
                  Buka tugas
                </Link>
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="Belum ada tugas" description="Daftar tugas grup akan muncul di sini." />
      )}
    </div>
  )
}

export function GroupTaskDetailScreen() {
  const { user } = useAuth()
  const { slug, taskId } = useParams({ from: '/groups/$slug/tasks/$taskId' })
  const queryClient = useQueryClient()
  const [submission, setSubmission] = useState('')
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({})
  const detailQuery = useQuery({
    queryKey: ['group-task', slug, taskId],
    queryFn: () => getGroupTaskDetail(slug, taskId),
    enabled: Boolean(user),
  })
  const submitMutation = useMutation({
    mutationFn: () => createSubmission(taskId, user!.id, submission, slug),
    onSuccess: async () => {
      setSubmission('')
      await queryClient.invalidateQueries({ queryKey: ['group-task', slug, taskId] })
      toast.success('Submission terkirim.')
    },
  })
  const reviewMutation = useMutation({
    mutationFn: ({ submissionId, status }: { submissionId: string; status: 'accepted' | 'revision' }) =>
      reviewSubmission(submissionId, status, reviewNotes[submissionId] ?? ''),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['group-task', slug, taskId] })
    },
  })

  if (!user || !detailQuery.data) {
    return null
  }

  const isManager = detailQuery.data.group.viewerRole && detailQuery.data.group.viewerRole !== 'anggota'

  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="Tugas" title={detailQuery.data.task.title} action={<GroupTopNav slug={slug} active="tasks" />} />
      <Card className="space-y-3">
        <p className="text-sm leading-7 text-ink-600">{detailQuery.data.task.description}</p>
        <p className="text-xs text-ink-400">Deadline {formatLongDate(detailQuery.data.task.dueDate)}</p>
      </Card>
      {!isManager ? (
        <Card className="space-y-3">
          <Textarea
            value={submission}
            onChange={(event) => setSubmission(event.target.value)}
            placeholder="Tulis submission Anda"
            className="rounded-[1.5rem] focus:border-black/8 focus:ring-0"
          />
          <div className="flex justify-end">
            <Button disabled={!submission.trim() || submitMutation.isPending} onClick={() => submitMutation.mutate()}>
              Kirim submission
            </Button>
          </div>
        </Card>
      ) : null}
      <div className="space-y-4">
        {detailQuery.data.submissions.map((item) => (
          <Card key={item.id} className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={item.status === 'accepted' ? 'success' : item.status === 'revision' ? 'outline' : 'gold'}>
                {item.status}
              </Badge>
              <span className="text-xs text-ink-400">{relativeTime(item.submittedAt)}</span>
            </div>
            <p className="text-sm leading-7 text-ink-600">{item.content}</p>
            {isManager ? (
              <>
                <Textarea
                  value={reviewNotes[item.id] ?? item.note}
                  onChange={(event) => setReviewNotes((current) => ({ ...current, [item.id]: event.target.value }))}
                  className="rounded-[1.5rem] focus:border-black/8 focus:ring-0"
                  placeholder="Catatan review"
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => reviewMutation.mutate({ submissionId: item.id, status: 'revision' })}>
                    Minta revisi
                  </Button>
                  <Button size="sm" onClick={() => reviewMutation.mutate({ submissionId: item.id, status: 'accepted' })}>
                    Terima
                  </Button>
                </div>
              </>
            ) : item.note ? (
              <p className="rounded-2xl bg-black/3 px-4 py-3 text-sm text-ink-600">{item.note}</p>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  )
}

export function GroupSettingsScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { slug } = useParams({ from: '/groups/$slug/settings' })
  const queryClient = useQueryClient()
  const [description, setDescription] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [tags, setTags] = useState('')
  const detailQuery = useQuery({
    queryKey: ['group', slug],
    queryFn: () => getGroupDetail(slug),
    enabled: Boolean(user),
  })
  const requestsQuery = useQuery({
    queryKey: ['group-requests', slug],
    queryFn: () => getGroupJoinRequests(slug),
    enabled: detailQuery.data?.group.viewerRole === 'admin' || detailQuery.data?.group.viewerRole === 'moderator',
  })

  const leaveMutation = useMutation({
    mutationFn: () => leaveGroup(slug),
    onSuccess: async () => {
      toast.success('Anda keluar dari grup.')
      await navigate({ to: '/groups' })
    },
  })
  const reviewJoinMutation = useMutation({
    mutationFn: ({ requestId, status }: { requestId: string; status: 'approved' | 'rejected' }) =>
      reviewJoinRequest(slug, requestId, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['group-requests', slug] })
      await queryClient.invalidateQueries({ queryKey: ['group', slug] })
    },
  })
  const roleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: 'moderator' | 'admin' | 'ustadz' | 'anggota' }) =>
      updateGroupMemberRole(slug, memberId, role),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['group', slug] })
    },
  })
  const kickMutation = useMutation({
    mutationFn: (memberId: string) => kickGroupMember(slug, memberId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['group', slug] })
    },
  })
  const updateMutation = useMutation({
    mutationFn: () =>
      updateGroup(slug, {
        description,
        coverUrl,
        tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      }),
    onSuccess: async () => {
      toast.success('Pengaturan grup diperbarui.')
      await queryClient.invalidateQueries({ queryKey: ['group', slug] })
    },
  })

  if (!user || !detailQuery.data) {
    return null
  }

  const { group, members } = detailQuery.data
  const canManage = group.viewerRole === 'admin' || group.viewerRole === 'moderator'
  const isModerator = group.viewerRole === 'moderator'

  useEffect(() => {
    setDescription(group.description)
    setCoverUrl(group.coverUrl)
    setTags(group.tags.join(', '))
  }, [group.coverUrl, group.description, group.tags])

  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="Pengaturan grup" title={group.name} action={<GroupTopNav slug={slug} active="settings" />} />
      <Card className="space-y-4">
        <p className="text-sm leading-7 text-ink-500">Semua anggota dapat keluar grup dari halaman ini.</p>
        <Button variant="danger" onClick={() => leaveMutation.mutate()}>
          Keluar grup
        </Button>
      </Card>

      {canManage ? (
        <Card className="space-y-4">
          <h2 className="text-xl font-semibold text-ink-900">Info grup</h2>
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} className="rounded-[1.5rem] focus:border-black/8 focus:ring-0" />
          <Input value={coverUrl} onChange={(event) => setCoverUrl(event.target.value)} placeholder="Cover URL" />
          <Input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="Tag dipisah koma" />
          <div className="flex justify-end">
            <Button onClick={() => updateMutation.mutate()}>Simpan perubahan</Button>
          </div>
        </Card>
      ) : null}

      {canManage ? (
        <Card className="space-y-4">
          <h2 className="text-xl font-semibold text-ink-900">Permintaan bergabung</h2>
          {requestsQuery.data?.length ? (
            requestsQuery.data.map((request) => (
              <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-black/3 px-4 py-3">
                <div>
                  <p className="font-semibold text-ink-900">{request.user.name}</p>
                  <p className="text-xs text-ink-400">{relativeTime(request.requestedAt)}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => reviewJoinMutation.mutate({ requestId: request.id, status: 'rejected' })}>
                    Tolak
                  </Button>
                  <Button size="sm" onClick={() => reviewJoinMutation.mutate({ requestId: request.id, status: 'approved' })}>
                    Terima
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-ink-500">Tidak ada permintaan tertunda.</p>
          )}
        </Card>
      ) : null}

      {canManage ? (
        <Card className="space-y-4">
          <h2 className="text-xl font-semibold text-ink-900">Manajemen anggota</h2>
          {members.map((member) => (
            <div key={member.id} className="space-y-3 rounded-2xl bg-black/3 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink-900">{member.user?.name}</p>
                  <p className="text-xs text-ink-400">
                    @{member.user?.username} • {member.groupRole}
                  </p>
                </div>
                {member.userId !== user.id ? (
                  <Button size="sm" variant="danger" onClick={() => kickMutation.mutate(member.id)}>
                    Kick
                  </Button>
                ) : null}
              </div>
              {isModerator ? (
                <div className="flex flex-wrap gap-2">
                  {(['moderator', 'admin', 'ustadz', 'anggota'] as const).map((role) => (
                    <Button
                      key={role}
                      size="sm"
                      variant={member.groupRole === role ? 'primary' : 'secondary'}
                      onClick={() => roleMutation.mutate({ memberId: member.id, role })}
                    >
                      {role}
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </Card>
      ) : null}
    </div>
  )
}
