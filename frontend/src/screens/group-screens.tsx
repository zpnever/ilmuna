import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { Heart, ImagePlus, MessageCircle, Plus, ThumbsDown } from 'lucide-react'
import { toast } from 'sonner'

import { PostComposerDialog, QuranQuotePreview } from '@/components/social'
import { Badge, Button, Card, Dialog, DialogContent, EmptyState, Input, SectionHeading, Textarea } from '@/components/ui'
import { useAuth } from '@/context/auth-context'
import {
  addGroupPostComment,
  createGroup,
  createGroupMaterial,
  createGroupPost,
  createSubmission,
  getGroupDetail,
  getGroupJoinRequests,
  getGroupMaterials,
  getGroupMembers,
  getGroupPostComments,
  getGroups,
  getGroupTaskDetail,
  getGroupTasks,
  kickGroupMember,
  leaveGroup,
  requestJoinGroup,
  reviewSubmission,
  reviewJoinRequest,
  toggleGroupPostReaction,
  updateGroup,
  updateGroupMemberRole,
} from '@/services/group-service'
import { uploadGroupCover, uploadMaterialFile } from '@/services/upload-service'
import { formatLongDate, markdownToHtml, relativeTime } from '@/lib/utils'
import type { GroupCommentThread, GroupDiscussionPost, GroupRole } from '@/types/domain'

function canManage(role?: GroupRole | null) {
  return role === 'moderator' || role === 'admin'
}

function canTeach(role?: GroupRole | null) {
  return role === 'moderator' || role === 'admin' || role === 'ustadz'
}

function GroupTopNav({ slug, active }: { slug: string; active: 'forum' | 'materials' | 'tasks' | 'members' | 'settings' }) {
  const items = [
    { to: '/groups/$slug', label: 'Forum', key: 'forum' },
    { to: '/groups/$slug/materials', label: 'Materi', key: 'materials' },
    { to: '/groups/$slug/tasks', label: 'Tugas', key: 'tasks' },
    { to: '/groups/$slug/members', label: 'Anggota', key: 'members' },
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

function GroupImageLightbox({ image, onClose }: { image: string | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(image)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        hideCloseButton
        overlayClassName="bg-black/92 backdrop-blur-none"
        className="inset-0 left-0 top-0 h-screen w-screen translate-x-0 translate-y-0 rounded-none border-none bg-transparent p-0 shadow-none"
      >
        <button type="button" className="flex h-full w-full items-center justify-center p-0" onClick={onClose}>
          {image ? <img src={image} alt="Preview" className="h-screen w-screen object-contain" /> : null}
        </button>
      </DialogContent>
    </Dialog>
  )
}

function GroupCommentSection({
  slug,
  postId,
}: {
  slug: string
  postId: string
}) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState('')
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [replyOpenFor, setReplyOpenFor] = useState<string | null>(null)
  const commentsQuery = useQuery({
    queryKey: ['group-post-comments', slug, postId],
    queryFn: () => getGroupPostComments(slug, postId),
  })
  const mutation = useMutation({
    mutationFn: ({ content, parentId }: { content: string; parentId: string | null }) =>
      addGroupPostComment(slug, postId, content, parentId),
    onSuccess: async (_, variables) => {
      if (variables.parentId) {
        setReplyDrafts((current) => ({ ...current, [variables.parentId!]: '' }))
        setReplyOpenFor(null)
      } else {
        setDraft('')
      }
      await queryClient.invalidateQueries({ queryKey: ['group', slug] })
      await queryClient.invalidateQueries({ queryKey: ['group-post-comments', slug, postId] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const comments = commentsQuery.data ?? []
  const topLevel = comments.filter((comment: GroupCommentThread) => !comment.parentId)
  const repliesByParent = comments.reduce<Record<string, GroupCommentThread[]>>((accumulator, comment: GroupCommentThread) => {
    if (comment.parentId) {
      accumulator[comment.parentId] ??= []
      accumulator[comment.parentId].push(comment)
    }
    return accumulator
  }, {})

  return (
    <div className="space-y-4 border-t border-black/8 pt-4">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Tulis komentar..."
          className="h-10 rounded-full bg-white"
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={!draft.trim() || mutation.isPending}
          onClick={() => mutation.mutate({ content: draft, parentId: null })}
        >
          Kirim
        </Button>
      </div>
      <div className="space-y-3">
        {topLevel.map((comment: GroupCommentThread) => (
          <div key={comment.id} className="rounded-3xl bg-black/3 p-4">
            <p className="text-sm font-semibold text-ink-900">{comment.authorName ?? 'Pengguna'}</p>
            <p className="mt-1 text-xs text-ink-400">{relativeTime(comment.createdAt)}</p>
            <p className="mt-3 text-sm leading-7 text-ink-700">{comment.content}</p>
            <button
              type="button"
              className="mt-3 text-xs font-semibold text-gold-500"
              onClick={() => setReplyOpenFor((current) => (current === comment.id ? null : comment.id))}
            >
              Balas
            </button>
            {replyOpenFor === comment.id ? (
              <div className="mt-3 flex gap-2">
                <Input
                  value={replyDrafts[comment.id] ?? ''}
                  onChange={(event) => setReplyDrafts((current) => ({ ...current, [comment.id]: event.target.value }))}
                  placeholder="Tulis balasan..."
                  className="h-10 rounded-full bg-white"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!replyDrafts[comment.id]?.trim() || mutation.isPending}
                  onClick={() => mutation.mutate({ content: replyDrafts[comment.id], parentId: comment.id })}
                >
                  Kirim
                </Button>
              </div>
            ) : null}
            {repliesByParent[comment.id]?.length ? (
              <div className="mt-3 space-y-2 border-l border-gold-400/30 pl-4">
                {repliesByParent[comment.id].map((reply: GroupCommentThread) => (
                  <div key={reply.id} className="rounded-2xl bg-white px-3 py-3">
                    <p className="text-sm font-semibold text-ink-900">{reply.authorName ?? 'Pengguna'}</p>
                    <p className="mt-1 text-xs text-ink-400">{relativeTime(reply.createdAt)}</p>
                    <p className="mt-2 text-sm leading-7 text-ink-600">{reply.content}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

function GroupPostBlocks({ post, onOpenImage }: { post: GroupDiscussionPost; onOpenImage: (image: string) => void }) {
  return (
    <div className="space-y-4">
      {post.content.map((block, index) => {
        if (block.type === 'markdown') {
          return (
            <div
              key={`${post.id}-markdown-${index}`}
              className="prose prose-sm max-w-none text-ink-700 prose-p:leading-8"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(block.markdown) }}
            />
          )
        }

        if (block.type === 'quranQuote') {
          return <QuranQuotePreview key={`${post.id}-quote-${index}`} quote={block} />
        }

        return (
          <div key={`${post.id}-images-${index}`} className="grid gap-3 sm:grid-cols-2">
            {block.images.map((image) => (
              <button key={image} type="button" className="overflow-hidden rounded-[1.5rem]" onClick={() => onOpenImage(image)}>
                <img src={image} alt="Group post" className="h-64 w-full object-cover transition hover:scale-[1.02]" />
              </button>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function GroupPostCard({
  slug,
  post,
  currentUserId,
}: {
  slug: string
  post: GroupDiscussionPost
  currentUserId: string
}) {
  const queryClient = useQueryClient()
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [activeImage, setActiveImage] = useState<string | null>(null)
  const reactionMutation = useMutation({
    mutationFn: (type: 'like' | 'dislike') => toggleGroupPostReaction(slug, post.id, type),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['group', slug] })
    },
  })

  return (
    <>
      <Card className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-ink-900">{post.authorName}</p>
            <p className="text-xs text-ink-400">
              @{post.authorUsername} • {relativeTime(post.createdAt)}
            </p>
          </div>
        </div>
        <GroupPostBlocks post={post} onOpenImage={setActiveImage} />
        <div className="flex flex-wrap items-center gap-2 border-t border-black/8 pt-4">
          <Button
            size="sm"
            variant={post.likeUserIds.includes(currentUserId) ? 'primary' : 'secondary'}
            onClick={() => reactionMutation.mutate('like')}
          >
            <Heart className="mr-2 h-4 w-4" />
            {post.likeUserIds.length}
          </Button>
          <Button
            size="sm"
            variant={post.dislikeUserIds.includes(currentUserId) ? 'primary' : 'secondary'}
            onClick={() => reactionMutation.mutate('dislike')}
          >
            <ThumbsDown className="mr-2 h-4 w-4" />
            {post.dislikeUserIds.length}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setCommentsOpen((current) => !current)}>
            <MessageCircle className="mr-2 h-4 w-4" />
            {post.commentCount}
          </Button>
        </div>
        {commentsOpen ? <GroupCommentSection slug={slug} postId={post.id} /> : null}
      </Card>
      <GroupImageLightbox image={activeImage} onClose={() => setActiveImage(null)} />
    </>
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
        description="Klik grup untuk masuk ke ruang komunitas, materi, tugas, dan anggotanya."
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

  const coverUploadMutation = useMutation({
    mutationFn: uploadGroupCover,
    onSuccess: (payload) => {
      setCoverUrl(payload.url)
      toast.success('Cover grup berhasil diunggah.')
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
            <span>Cover grup</span>
            <Input value={coverUrl} onChange={(event) => setCoverUrl(event.target.value)} />
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) {
                  coverUploadMutation.mutate(file)
                }
              }}
            />
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
  const detailQuery = useQuery({
    queryKey: ['group', slug],
    queryFn: () => getGroupDetail(slug),
    enabled: Boolean(user),
  })

  if (!user || !detailQuery.data) {
    return null
  }

  const { group } = detailQuery.data
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
            </div>
            <GroupTopNav slug={slug} active="forum" />
          </div>
        </div>
      </Card>

      {!canView ? (
        <EmptyState title="Forum internal hanya untuk anggota" description="Ajukan bergabung untuk melihat diskusi grup private ini." />
      ) : (
        <>
          {group.membershipStatus === 'member' ? (
            <PostComposerDialog
              currentUserId={user.id}
              allowTags={false}
              successMessage="Postingan grup dikirim."
              submitLabel="Kirim ke forum"
              invalidateKeys={[['group', slug]]}
              onSubmit={(input) => createGroupPost(slug, { blocks: input.blocks, images: input.images })}
              trigger={
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Tulis ke forum
                </Button>
              }
            />
          ) : null}

          <div className="space-y-4">
            {detailQuery.data.group.forumPosts.length ? (
              detailQuery.data.group.forumPosts.map((post) => (
                <GroupPostCard key={post.id} slug={slug} post={post} currentUserId={user.id} />
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

export function GroupMembersScreen() {
  const { user } = useAuth()
  const { slug } = useParams({ from: '/groups/$slug/members' })
  const queryClient = useQueryClient()
  const detailQuery = useQuery({
    queryKey: ['group', slug],
    queryFn: () => getGroupDetail(slug),
    enabled: Boolean(user),
  })
  const membersQuery = useQuery({
    queryKey: ['group-members', slug],
    queryFn: () => getGroupMembers(slug),
    enabled: Boolean(user),
  })
  const requestsQuery = useQuery({
    queryKey: ['group-requests', slug],
    queryFn: () => getGroupJoinRequests(slug),
    enabled: canManage(detailQuery.data?.group.viewerRole),
  })
  const reviewJoinMutation = useMutation({
    mutationFn: ({ requestId, status }: { requestId: string; status: 'approved' | 'rejected' }) =>
      reviewJoinRequest(slug, requestId, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['group-requests', slug] })
      await queryClient.invalidateQueries({ queryKey: ['group', slug] })
      await queryClient.invalidateQueries({ queryKey: ['group-members', slug] })
    },
  })
  const roleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: 'moderator' | 'admin' | 'ustadz' | 'anggota' }) =>
      updateGroupMemberRole(slug, memberId, role),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['group-members', slug] })
      await queryClient.invalidateQueries({ queryKey: ['group', slug] })
    },
  })
  const kickMutation = useMutation({
    mutationFn: (memberId: string) => kickGroupMember(slug, memberId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['group-members', slug] })
      await queryClient.invalidateQueries({ queryKey: ['group', slug] })
    },
  })

  if (!user || !detailQuery.data) {
    return null
  }

  const { group } = detailQuery.data

  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="Anggota" title={detailQuery.data.group.name} action={<GroupTopNav slug={slug} active="members" />} />
      {canManage(group.viewerRole) ? (
        <Card className="space-y-4">
          <h2 className="text-xl font-semibold text-ink-900">Permintaan bergabung</h2>
          {requestsQuery.data?.length ? (
            requestsQuery.data.map((request) => (
              <div key={request.id} className="rounded-3xl bg-black/3 p-4">
                <p className="font-semibold text-ink-900">{request.user.name}</p>
                <p className="text-sm text-ink-500">@{request.user.username}</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => reviewJoinMutation.mutate({ requestId: request.id, status: 'approved' })}>
                    Setujui
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => reviewJoinMutation.mutate({ requestId: request.id, status: 'rejected' })}>
                    Tolak
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-ink-500">Belum ada permintaan bergabung.</p>
          )}
        </Card>
      ) : null}
      <div className="space-y-4">
        {membersQuery.data?.map((member) => (
          <Card key={member.id} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-ink-900">{member.user?.name ?? 'Anggota grup'}</p>
                <p className="text-sm text-ink-500">@{member.user?.username ?? '-'}</p>
              </div>
              <Badge variant="gold">{member.groupRole}</Badge>
            </div>
            {group.viewerRole === 'moderator' && member.userId !== user.id ? (
              <div className="flex flex-wrap gap-2">
                {(['moderator', 'admin', 'ustadz', 'anggota'] as const).map((role) => (
                  <Button key={role} size="sm" variant="secondary" onClick={() => roleMutation.mutate({ memberId: member.id, role })}>
                    {role}
                  </Button>
                ))}
              </div>
            ) : null}
            {canManage(group.viewerRole) && member.userId !== user.id ? (
              <div>
                <Button size="sm" variant="danger" onClick={() => kickMutation.mutate(member.id)}>
                  Kick anggota
                </Button>
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  )
}

export function GroupMaterialsScreen() {
  const { user } = useAuth()
  const { slug } = useParams({ from: '/groups/$slug/materials' })
  const queryClient = useQueryClient()
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
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('pdf')
  const [resourceUrl, setResourceUrl] = useState('')
  const [uploadedMaterial, setUploadedMaterial] = useState<{ url: string; fileName: string; mimeType: string } | null>(null)

  const createMaterialMutation = useMutation({
    mutationFn: () =>
      createGroupMaterial(slug, {
        title,
        description,
        type,
        resourceUrl,
        fileUrl: uploadedMaterial?.url ?? null,
        fileName: uploadedMaterial?.fileName ?? null,
        mimeType: uploadedMaterial?.mimeType ?? null,
      }),
    onSuccess: async () => {
      toast.success('Materi berhasil ditambahkan.')
      setTitle('')
      setDescription('')
      setType('pdf')
      setResourceUrl('')
      setUploadedMaterial(null)
      await queryClient.invalidateQueries({ queryKey: ['group-materials', slug] })
    },
  })

  const uploadMaterialMutation = useMutation({
    mutationFn: uploadMaterialFile,
    onSuccess: (payload) => {
      setUploadedMaterial(payload)
      toast.success('File materi berhasil diunggah.')
    },
  })

  if (!user || !detailQuery.data) {
    return null
  }

  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="Materi" title={detailQuery.data.group.name} action={<GroupTopNav slug={slug} active="materials" />} />
      {canTeach(detailQuery.data.group.viewerRole) ? (
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-ink-900">Tambah materi</h2>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Judul materi" />
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Deskripsi materi" className="rounded-[1.5rem] focus:border-black/8 focus:ring-0" />
          <div className="grid gap-4 md:grid-cols-2">
            <Input value={type} onChange={(event) => setType(event.target.value)} placeholder="Jenis materi" />
            <Input value={resourceUrl} onChange={(event) => setResourceUrl(event.target.value)} placeholder="External URL (opsional)" />
          </div>
          <label className="flex h-11 cursor-pointer items-center justify-center rounded-full border border-black/10 px-4 text-sm font-medium text-ink-700 transition hover:bg-black/5">
            <ImagePlus className="mr-2 h-4 w-4" />
            Upload file materi
            <input
              type="file"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) {
                  uploadMaterialMutation.mutate(file)
                }
              }}
            />
          </label>
          {uploadedMaterial ? <p className="text-sm text-ink-500">File terunggah: {uploadedMaterial.fileName}</p> : null}
          <div className="flex justify-end">
            <Button onClick={() => createMaterialMutation.mutate()} disabled={!title.trim() || !description.trim()}>
              Simpan materi
            </Button>
          </div>
        </Card>
      ) : null}
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
  const leaveMutation = useMutation({
    mutationFn: () => leaveGroup(slug),
    onSuccess: async () => {
      toast.success('Anda keluar dari grup.')
      await navigate({ to: '/groups' })
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
  const coverUploadMutation = useMutation({
    mutationFn: uploadGroupCover,
    onSuccess: (payload) => {
      setCoverUrl(payload.url)
      toast.success('Cover grup berhasil diunggah.')
    },
  })

  useEffect(() => {
    const group = detailQuery.data?.group
    if (!group) {
      return
    }
    setDescription(group.description)
    setCoverUrl(group.coverUrl)
    setTags(group.tags.join(', '))
  }, [detailQuery.data?.group])

  if (!user || !detailQuery.data) {
    return null
  }

  const { group } = detailQuery.data

  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="Pengaturan grup" title={group.name} action={<GroupTopNav slug={slug} active="settings" />} />
      {canManage(group.viewerRole) ? (
        <Card className="space-y-4">
          <Input value={coverUrl} onChange={(event) => setCoverUrl(event.target.value)} placeholder="Cover URL" />
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) {
                coverUploadMutation.mutate(file)
              }
            }}
          />
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} className="rounded-[1.5rem] focus:border-black/8 focus:ring-0" />
          <Input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="Tag dipisah koma" />
          <div className="flex justify-end">
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              Simpan perubahan
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="flex justify-end">
        <Button variant="danger" onClick={() => leaveMutation.mutate()}>
          Keluar grup
        </Button>
      </div>
    </div>
  )
}
