import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { FileText, FolderOpenDot, ListChecks, Users } from 'lucide-react'

import { Badge, Button, Card, EmptyState, SectionHeading, Textarea } from '@/components/ui'
import { useAuth } from '@/context/auth-context'
import {
  createSubmission,
  getGroupDetail,
  getGroupMaterials,
  getGroups,
  getGroupTaskDetail,
  getGroupTasks,
  reviewSubmission,
} from '@/services/group-service'
import { readDatabase } from '@/lib/storage'
import { formatLongDate, relativeTime } from '@/lib/utils'

function userName(id: string) {
  return readDatabase().users.find((entry) => entry.id === id)?.name ?? 'Unknown'
}

export function GroupsScreen() {
  const groupsQuery = useQuery({
    queryKey: ['groups'],
    queryFn: getGroups,
  })

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Komunitas"
        title="Grup pengajian"
        description="Bergabung, membaca forum, membuka materi, dan mengerjakan tugas semuanya melalui modul grup ini."
      />
      <div className="grid gap-4 xl:grid-cols-2">
        {groupsQuery.data?.map((group) => (
          <Card key={group.id} className="overflow-hidden p-0">
            <div className="h-40 bg-cover bg-center" style={{ backgroundImage: `url(${group.coverUrl})` }} />
            <div className="space-y-4 px-5 py-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-ink-900">{group.name}</h2>
                  <Badge variant={group.isPublic ? 'success' : 'outline'}>
                    {group.isPublic ? 'Publik' : 'Private'}
                  </Badge>
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
              <div className="grid gap-3 sm:grid-cols-3">
                <Button asChild variant="secondary">
                  <Link to="/groups/$slug" params={{ slug: group.slug }}>
                    Forum
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link to="/groups/$slug/materials" params={{ slug: group.slug }}>
                    Materi
                  </Link>
                </Button>
                <Button asChild>
                  <Link to="/groups/$slug/tasks" params={{ slug: group.slug }}>
                    Tugas
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function GroupDetailScreen() {
  const { slug } = useParams({ from: '/groups/$slug' })
  const detailQuery = useQuery({
    queryKey: ['group', slug],
    queryFn: () => getGroupDetail(slug),
  })

  if (!detailQuery.data) {
    return null
  }

  const { group, members } = detailQuery.data

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-0">
        <div className="h-48 bg-cover bg-center" style={{ backgroundImage: `url(${group.coverUrl})` }} />
        <div className="space-y-4 px-5 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold text-ink-900">{group.name}</h1>
            <Badge variant="gold">Invite code: {group.inviteCode}</Badge>
          </div>
          <p className="max-w-3xl text-sm leading-7 text-ink-500">{group.description}</p>
          <div className="flex flex-wrap gap-2">
            {group.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-4">
          <SectionHeading
            eyebrow="Forum"
            title="Diskusi internal grup"
            description="Post dan respon internal untuk ritme belajar kelompok."
          />
          {group.forumPosts.map((post) => (
            <Card key={post.id} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink-900">{userName(post.authorId)}</p>
                  <p className="text-xs text-ink-400">{relativeTime(post.createdAt)}</p>
                </div>
                <Badge variant="outline">Forum</Badge>
              </div>
              <p className="text-sm leading-7 text-ink-600">{post.content}</p>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          <Card className="space-y-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-gold-500" />
              <p className="text-sm font-semibold text-ink-900">Anggota grup</p>
            </div>
            <div className="space-y-3">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between rounded-2xl bg-black/4 px-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{userName(member.userId)}</p>
                    <p className="text-xs text-ink-500">{member.groupRole}</p>
                  </div>
                  <Badge variant={member.groupRole === 'ustadz' ? 'gold' : 'outline'}>
                    {member.groupRole}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
          <Card className="space-y-3">
            <p className="text-sm font-semibold text-ink-900">Pintasan grup</p>
            <Button asChild variant="secondary" className="w-full justify-start">
              <Link to="/groups/$slug/materials" params={{ slug }}>
                <FolderOpenDot className="mr-2 h-4 w-4" />
                Buka materi
              </Link>
            </Button>
            <Button asChild variant="secondary" className="w-full justify-start">
              <Link to="/groups/$slug/tasks" params={{ slug }}>
                <ListChecks className="mr-2 h-4 w-4" />
                Lihat tugas
              </Link>
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}

export function GroupMaterialsScreen() {
  const { slug } = useParams({ from: '/groups/$slug/materials' })
  const materialsQuery = useQuery({
    queryKey: ['group-materials', slug],
    queryFn: () => getGroupMaterials(slug),
  })

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Materi"
        title="Materi belajar grup"
        description="File, tautan, dan teks pendukung kajian grup tersimpan rapi di sini."
      />
      <div className="space-y-4">
        {materialsQuery.data?.map((material) => (
          <Card key={material.id} className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gold-500" />
                <p className="text-base font-semibold text-ink-900">{material.title}</p>
                <Badge variant="outline">{material.type}</Badge>
              </div>
              <p className="text-sm leading-7 text-ink-500">{material.description}</p>
              <p className="text-xs text-ink-400">{formatLongDate(material.createdAt)}</p>
            </div>
            {material.resourceUrl ? (
              <Button variant="secondary" size="sm">
                Buka
              </Button>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  )
}

export function GroupTasksScreen() {
  const { slug } = useParams({ from: '/groups/$slug/tasks' })
  const tasksQuery = useQuery({
    queryKey: ['group-tasks', slug],
    queryFn: () => getGroupTasks(slug),
  })

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Tugas"
        title="Daftar tugas hafalan dan catatan"
        description="Siswa mengumpulkan tugas di sini, lalu ustadz meninjau status accepted atau revision."
      />
      <div className="space-y-4">
        {tasksQuery.data?.map((task) => (
          <Card key={task.id} className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-ink-900">{task.title}</h2>
              <Badge variant="gold">{task.type}</Badge>
              <Badge variant="outline">{task.surahRef}</Badge>
            </div>
            <p className="text-sm leading-7 text-ink-500">{task.description}</p>
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-ink-400">Deadline {formatLongDate(task.dueDate)}</p>
              <Button asChild>
                <Link to="/groups/$slug/tasks/$taskId" params={{ slug, taskId: task.id }}>
                  Buka detail
                </Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function GroupTaskDetailScreen() {
  const { user } = useAuth()
  const { slug, taskId } = useParams({ from: '/groups/$slug/tasks/$taskId' })
  const [draft, setDraft] = useState('')
  const [feedback, setFeedback] = useState('')
  const queryClient = useQueryClient()
  const detailQuery = useQuery({
    queryKey: ['group-task-detail', slug, taskId],
    queryFn: () => getGroupTaskDetail(slug, taskId),
  })
  const submissionMutation = useMutation({
    mutationFn: () => createSubmission(taskId, user!.id, draft),
    onSuccess: async () => {
      setDraft('')
      await queryClient.invalidateQueries({ queryKey: ['group-task-detail', slug, taskId] })
    },
  })
  const reviewMutation = useMutation({
    mutationFn: (status: 'accepted' | 'revision') =>
      reviewSubmission(selectedSubmission?.id ?? '', status, feedback),
    onSuccess: async () => {
      setFeedback('')
      await queryClient.invalidateQueries({ queryKey: ['group-task-detail', slug, taskId] })
    },
  })

  if (!user || !detailQuery.data) {
    return null
  }

  const { group, task, submissions } = detailQuery.data
  const mySubmission = submissions.find((entry) => entry.userId === user.id)
  const selectedSubmission = submissions[0]
  const canReview = user.activeRole === 'ustadz' || user.activeRole === 'admin'
  const studentSubmissions = useMemo(
    () => submissions.filter((entry) => entry.userId !== 'user-1'),
    [submissions],
  )

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow={group.name}
        title={task.title}
        description={task.description}
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="gold">{task.type}</Badge>
            <Badge variant="outline">{task.surahRef}</Badge>
            <Badge variant="outline">Deadline {formatLongDate(task.dueDate)}</Badge>
          </div>
          {!canReview ? (
            <>
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Tulis setoran hafalan, refleksi, atau catatan tugas Anda..."
              />
              <Button disabled={!draft.trim() || submissionMutation.isPending} onClick={() => submissionMutation.mutate()}>
                Kumpulkan tugas
              </Button>
              {mySubmission ? (
                <Card className="border-dashed bg-black/[0.03]">
                  <p className="text-sm font-semibold text-ink-900">Submission Anda</p>
                  <p className="mt-2 text-sm text-ink-600">{mySubmission.content}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant={mySubmission.status === 'accepted' ? 'success' : mySubmission.status === 'revision' ? 'gold' : 'outline'}>
                      {mySubmission.status}
                    </Badge>
                    {mySubmission.note ? <p className="text-xs text-ink-500">{mySubmission.note}</p> : null}
                  </div>
                </Card>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-sm leading-7 text-ink-500">
                Sebagai ustadz/admin, Anda bisa meninjau semua submission dan memberi status accepted atau revision.
              </p>
              <Textarea
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                placeholder="Catatan feedback untuk submission terpilih..."
              />
              <div className="flex gap-3">
                <Button
                  variant="gold"
                  disabled={!selectedSubmission || reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate('accepted')}
                >
                  Accepted
                </Button>
                <Button
                  variant="secondary"
                  disabled={!selectedSubmission || reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate('revision')}
                >
                  Revision
                </Button>
              </div>
            </>
          )}
        </Card>
        <div className="space-y-4">
          <SectionHeading
            eyebrow="Submission"
            title={canReview ? 'Daftar submission siswa' : 'Riwayat tugas kelompok'}
          />
          {studentSubmissions.length ? (
            studentSubmissions.map((submission) => (
              <Card key={submission.id} className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-ink-900">{userName(submission.userId)}</p>
                  <Badge
                    variant={
                      submission.status === 'accepted'
                        ? 'success'
                        : submission.status === 'revision'
                          ? 'gold'
                          : 'outline'
                    }
                  >
                    {submission.status}
                  </Badge>
                </div>
                <p className="text-sm leading-7 text-ink-600">{submission.content}</p>
                {submission.note ? <p className="text-xs text-ink-500">Catatan: {submission.note}</p> : null}
              </Card>
            ))
          ) : (
            <EmptyState
              title="Belum ada submission"
              description="Submission dari anggota grup akan muncul di sini."
            />
          )}
        </div>
      </div>
    </div>
  )
}
