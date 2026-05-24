import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { EditorContent, useEditor } from '@tiptap/react'
import Placeholder from '@tiptap/extension-placeholder'
import StarterKit from '@tiptap/starter-kit'
import {
  BookOpen,
  Heart,
  MessageCircle,
  MessageSquareQuote,
  Send,
  ThumbsDown,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  Avatar,
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  EmptyState,
  Input,
  ScrollArea,
  SectionHeading,
  Textarea,
} from '@/components/ui'
import { readDatabase } from '@/lib/storage'
import { cn, relativeTime, stripHtml } from '@/lib/utils'
import {
  addComment,
  createPost,
  getComments,
  sharePost,
  toggleReaction,
  type FeedPost,
} from '@/services/post-service'
import { getSurahDetail, getSurahList } from '@/services/quran-service'
import type { Ayah, CommentThread, Profile, QuranQuoteBlock } from '@/types/domain'

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
}

function extractQuote(post: FeedPost) {
  return post.content.find((entry): entry is QuranQuoteBlock => entry.type === 'quranQuote') ?? null
}

function extractRichHtml(post: FeedPost) {
  return post.content.find((entry) => entry.type === 'richText')?.html ?? '<p></p>'
}

async function filesToDataUrls(fileList: FileList) {
  const files = Array.from(fileList).slice(0, 4)

  return Promise.all(
    files.map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          if (file.size > 5 * 1024 * 1024) {
            reject(new Error(`File ${file.name} melebihi 5MB.`))
            return
          }

          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.onerror = () => reject(new Error(`Gagal membaca ${file.name}.`))
          reader.readAsDataURL(file)
        }),
    ),
  )
}

function authorNameById(authorId: string) {
  return readDatabase().users.find((entry) => entry.id === authorId)?.name ?? 'Unknown'
}

function CommentItem({
  comment,
  replies,
  currentUserId,
  postId,
}: {
  comment: CommentThread
  replies: CommentThread[]
  currentUserId: string
  postId: string
}) {
  const queryClient = useQueryClient()
  const [reply, setReply] = useState('')
  const mutation = useMutation({
    mutationFn: () => addComment(postId, currentUserId, reply, comment.id),
    onSuccess: async () => {
      setReply('')
      await queryClient.invalidateQueries({ queryKey: ['comments', postId] })
      await queryClient.invalidateQueries({ queryKey: ['feed'] })
      await queryClient.invalidateQueries({ queryKey: ['explore'] })
    },
  })

  return (
    <div className="space-y-3 rounded-3xl bg-black/3 p-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          <span>{authorNameById(comment.authorId)}</span>
          <span className="text-xs font-normal text-ink-400">{relativeTime(comment.createdAt)}</span>
        </div>
        <p className="text-sm text-ink-600">{comment.content}</p>
      </div>
      <div className="flex gap-2">
        <Input
          value={reply}
          onChange={(event) => setReply(event.target.value)}
          placeholder="Balas komentar..."
          className="h-10 rounded-full bg-white"
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={!reply.trim() || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          Balas
        </Button>
      </div>
      {replies.length ? (
        <div className="space-y-2 border-l border-gold-400/30 pl-4">
          {replies.map((entry) => (
            <div key={entry.id} className="rounded-2xl bg-white px-3 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                <span>{authorNameById(entry.authorId)}</span>
                <span className="text-xs font-normal text-ink-400">{relativeTime(entry.createdAt)}</span>
              </div>
              <p className="mt-1 text-sm text-ink-600">{entry.content}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function QuranQuotePreview({ quote }: { quote: QuranQuoteBlock }) {
  return (
    <Card className="border-gold-400/40 bg-gold-400/8 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-gold-500">
        <BookOpen className="h-4 w-4" />
        Kutipan Al-Qur'an
      </div>
      <p dir="rtl" className="mt-3 text-right text-2xl leading-loose text-ink-900">
        {quote.arabic}
      </p>
      <p className="mt-2 text-sm text-ink-600">{quote.translation}</p>
      <p className="mt-2 text-xs font-semibold text-ink-500">
        {quote.surahNameLatin} {quote.ayahNumber}
      </p>
    </Card>
  )
}

function QuranPickerDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (quote: QuranQuoteBlock) => void
}) {
  const [surahNumber, setSurahNumber] = useState(1)
  const [search, setSearch] = useState('')
  const surahListQuery = useQuery({
    queryKey: ['quran', 'surah-list'],
    queryFn: getSurahList,
  })
  const surahDetailQuery = useQuery({
    queryKey: ['quran', 'detail', surahNumber],
    queryFn: () => getSurahDetail(surahNumber),
    enabled: open,
  })

  const ayahs = useMemo(() => {
    const items = surahDetailQuery.data?.ayahs ?? []
    if (!search.trim()) {
      return items.slice(0, 12)
    }
    const term = search.trim().toLowerCase()
    return items.filter(
      (entry) =>
        entry.translation.toLowerCase().includes(term) || String(entry.ayahNumber).includes(term),
    )
  }, [search, surahDetailQuery.data?.ayahs])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0">
        <div className="border-b border-black/8 px-6 py-5">
          <DialogTitle className="text-xl font-semibold text-ink-900">Sisipkan ayat ke postingan</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-ink-500">
            Pilih surah dan ayat yang ingin Anda sematkan sebagai blok kutipan.
          </DialogDescription>
        </div>
        <div className="grid gap-4 px-6 py-5 md:grid-cols-[220px_1fr]">
          <div className="space-y-3">
            <label className="space-y-2 text-sm font-medium text-ink-700">
              <span>Pilih surah</span>
              <select
                value={surahNumber}
                onChange={(event) => setSurahNumber(Number(event.target.value))}
                className="flex h-11 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none"
              >
                {surahListQuery.data?.map((surah) => (
                  <option key={surah.number} value={surah.number}>
                    {surah.number}. {surah.nameLatin}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium text-ink-700">
              <span>Cari ayat</span>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nomor ayat atau kata dalam terjemahan"
              />
            </label>
          </div>
          <ScrollArea className="h-[50vh] rounded-[2rem] border border-black/8 bg-black/[0.02] p-4">
            <div className="space-y-3">
              {ayahs.map((ayah: Ayah) => (
                <button
                  key={ayah.ayahNumber}
                  type="button"
                  className="w-full rounded-[1.5rem] border border-black/8 bg-white p-4 text-left transition hover:border-gold-400/40 hover:bg-gold-400/5"
                  onClick={() => {
                    onSelect({
                      type: 'quranQuote',
                      surahNumber: ayah.surahNumber,
                      ayahNumber: ayah.ayahNumber,
                      surahName: ayah.surahName,
                      surahNameLatin: ayah.surahNameLatin,
                      arabic: ayah.arabic,
                      translation: ayah.translation,
                    })
                    onOpenChange(false)
                    setSearch('')
                  }}
                >
                  <p dir="rtl" className="text-right text-2xl text-ink-900">
                    {ayah.arabic}
                  </p>
                  <p className="mt-2 text-sm text-ink-600">{ayah.translation}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-500">
                    Ayat {ayah.ayahNumber}
                  </p>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function PostComposer({ currentUserId }: { currentUserId: string }) {
  const queryClient = useQueryClient()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [quote, setQuote] = useState<QuranQuoteBlock | null>(null)
  const [images, setImages] = useState<string[]>([])
  const [tags, setTags] = useState('tafsir, komunitas')
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Tulis refleksi, catatan kajian, atau ketik /quran untuk menyisipkan ayat...',
      }),
    ],
    content: '<p></p>',
    onUpdate({ editor: currentEditor }) {
      const plain = currentEditor.getText().trim()
      if (plain.endsWith('/quran')) {
        setPickerOpen(true)
        currentEditor.commands.setContent(currentEditor.getHTML().replace('/quran', ''))
      }
    },
    immediatelyRender: false,
  })

  const createPostMutation = useMutation({
    mutationFn: () =>
      createPost({
        authorId: currentUserId,
        html: editor?.getHTML() ?? '<p></p>',
        images,
        tags: tags
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean),
        quranQuote: quote,
      }),
    onSuccess: async () => {
      toast.success('Postingan berhasil dibagikan.')
      editor?.commands.setContent('<p></p>')
      setImages([])
      setQuote(null)
      await queryClient.invalidateQueries({ queryKey: ['feed'] })
      await queryClient.invalidateQueries({ queryKey: ['explore'] })
      await queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })

  return (
    <Card className="space-y-4">
      <SectionHeading
        eyebrow="Composer"
        title="Bagikan ilmu atau refleksi"
        description="Postingan publik, gambar, dan kutipan ayat bisa dicoba sepenuhnya dengan dummy persistence."
      />
      <div className="rounded-[1.75rem] border border-black/8 bg-black/[0.02] p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => editor?.chain().focus().toggleBold().run()}>
            Bold
          </Button>
          <Button size="sm" variant="secondary" onClick={() => editor?.chain().focus().toggleItalic().run()}>
            Italic
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            List
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setPickerOpen(true)}>
            <MessageSquareQuote className="mr-2 h-4 w-4" />
            Sisipkan ayat
          </Button>
        </div>
        <EditorContent editor={editor} className="min-h-32 rounded-[1.5rem] bg-white p-4" />
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_260px]">
        <div className="space-y-3">
          <label className="space-y-2 text-sm font-medium text-ink-700">
            <span>Tag minat</span>
            <Input value={tags} onChange={(event) => setTags(event.target.value)} />
          </label>
          <label className="space-y-2 text-sm font-medium text-ink-700">
            <span>Tambahkan gambar</span>
            <div className="flex items-center gap-2">
              <label className="flex h-11 cursor-pointer items-center gap-2 rounded-full border border-dashed border-black/20 px-4 text-sm text-ink-600 hover:border-gold-400/40 hover:text-ink-900">
                <Upload className="h-4 w-4" />
                Upload sampai 4 gambar
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={async (event) => {
                    const files = event.target.files
                    if (!files?.length) {
                      return
                    }
                    try {
                      const dataUrls = await filesToDataUrls(files)
                      setImages(dataUrls.slice(0, 4))
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : 'Gagal mengunggah gambar.')
                    }
                  }}
                />
              </label>
            </div>
          </label>
          {images.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {images.map((image) => (
                <div key={image} className="relative overflow-hidden rounded-[1.5rem]">
                  <img src={image} alt="Draft" className="h-40 w-full object-cover" />
                  <button
                    type="button"
                    className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold"
                    onClick={() => setImages((current) => current.filter((entry) => entry !== image))}
                  >
                    Hapus
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="space-y-3">
          {quote ? <QuranQuotePreview quote={quote} /> : <Card className="border-dashed p-4 text-sm text-ink-500">Belum ada kutipan ayat yang disematkan.</Card>}
          <Button
            className="w-full"
            disabled={createPostMutation.isPending || !stripHtml(editor?.getHTML() ?? '').length}
            onClick={() => createPostMutation.mutate()}
          >
            <Send className="mr-2 h-4 w-4" />
            Publikasikan
          </Button>
        </div>
      </div>
      <QuranPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} onSelect={setQuote} />
    </Card>
  )
}

export function PostCard({ post, currentUserId }: { post: FeedPost; currentUserId: string }) {
  const queryClient = useQueryClient()
  const [showComments, setShowComments] = useState(false)
  const [commentDraft, setCommentDraft] = useState('')
  const commentsQuery = useQuery({
    queryKey: ['comments', post.id],
    queryFn: () => getComments(post.id),
    enabled: showComments,
  })
  const quote = extractQuote(post)
  const html = extractRichHtml(post)
  const topLevelComments = commentsQuery.data?.filter((entry) => entry.parentId === null) ?? []
  const groupedReplies = new Map<string, CommentThread[]>(
    (commentsQuery.data ?? [])
      .filter((entry) => entry.parentId)
      .reduce<[string, CommentThread[]][]>((groups, comment) => {
        const bucket = groups.find(([key]) => key === comment.parentId)
        if (bucket) {
          bucket[1].push(comment)
        } else if (comment.parentId) {
          groups.push([comment.parentId, [comment]])
        }
        return groups
      }, []),
  )

  const commentMutation = useMutation({
    mutationFn: () => addComment(post.id, currentUserId, commentDraft, null),
    onSuccess: async () => {
      setCommentDraft('')
      await queryClient.invalidateQueries({ queryKey: ['comments', post.id] })
      await queryClient.invalidateQueries({ queryKey: ['feed'] })
      await queryClient.invalidateQueries({ queryKey: ['explore'] })
    },
  })

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar src={post.authorAvatar} fallback={initials(post.authorName)} />
          <div>
            <Link
              to="/profile/$username"
              params={{ username: post.authorUsername }}
              className="text-sm font-semibold text-ink-900 hover:text-gold-500"
            >
              {post.authorName}
            </Link>
            <p className="text-xs text-ink-500">
              @{post.authorUsername} · {relativeTime(post.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {post.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      <div
        className="prose prose-sm max-w-none text-ink-700 prose-p:leading-7"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {quote ? <QuranQuotePreview quote={quote} /> : null}

      {post.images.length ? (
        <div className={cn('grid gap-3', post.images.length > 1 ? 'sm:grid-cols-2' : '')}>
          {post.images.map((image) => (
            <img
              key={image}
              src={image}
              alt={post.authorName}
              className="h-72 w-full rounded-[1.5rem] object-cover"
              loading="lazy"
            />
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border-t border-black/8 pt-4">
        <Button
          size="sm"
          variant={post.likeUserIds.includes(currentUserId) ? 'gold' : 'secondary'}
          onClick={async () => {
            await toggleReaction(post.id, currentUserId, 'like')
            await queryClient.invalidateQueries({ queryKey: ['feed'] })
            await queryClient.invalidateQueries({ queryKey: ['explore'] })
            await queryClient.invalidateQueries({ queryKey: ['profile'] })
          }}
        >
          <Heart className="mr-2 h-4 w-4" />
          {post.likeUserIds.length}
        </Button>
        <Button
          size="sm"
          variant={post.dislikeUserIds.includes(currentUserId) ? 'danger' : 'secondary'}
          onClick={async () => {
            await toggleReaction(post.id, currentUserId, 'dislike')
            await queryClient.invalidateQueries({ queryKey: ['feed'] })
            await queryClient.invalidateQueries({ queryKey: ['explore'] })
            await queryClient.invalidateQueries({ queryKey: ['profile'] })
          }}
        >
          <ThumbsDown className="mr-2 h-4 w-4" />
          {post.dislikeUserIds.length}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setShowComments((current) => !current)}>
          <MessageCircle className="mr-2 h-4 w-4" />
          {post.commentCount}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={async () => {
            await sharePost(post.id)
            toast.success('Tautan post disalin ke clipboard.')
            await navigator.clipboard.writeText(`ilmuna://post/${post.id}`)
            await queryClient.invalidateQueries({ queryKey: ['feed'] })
            await queryClient.invalidateQueries({ queryKey: ['explore'] })
          }}
        >
          Bagikan {post.shareCount}
        </Button>
      </div>

      {showComments ? (
        <div className="space-y-4 rounded-[1.75rem] bg-black/[0.03] p-4">
          <div className="flex gap-2">
            <Textarea
              value={commentDraft}
              onChange={(event) => setCommentDraft(event.target.value)}
              placeholder="Tulis komentar..."
              className="min-h-24 bg-white"
            />
            <Button
              className="self-end"
              disabled={!commentDraft.trim() || commentMutation.isPending}
              onClick={() => commentMutation.mutate()}
            >
              Kirim
            </Button>
          </div>
          <div className="space-y-3">
            {topLevelComments.length ? (
              topLevelComments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  replies={groupedReplies.get(comment.id) ?? []}
                  currentUserId={currentUserId}
                  postId={post.id}
                />
              ))
            ) : (
              <p className="text-sm text-ink-500">Belum ada komentar. Mulai percakapan pertama.</p>
            )}
          </div>
        </div>
      ) : null}
    </Card>
  )
}

export function ProfileHeader({
  profile,
  isOwner,
  onToggleFollow,
  isPending,
}: {
  profile: Profile
  isOwner: boolean
  onToggleFollow: () => void
  isPending: boolean
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div
        className="h-44 bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(17,17,17,0.3), rgba(201,168,76,0.1)), url(${profile.coverUrl})`,
        }}
      />
      <div className="space-y-5 px-5 py-5">
        <div className="-mt-16 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-4">
            <Avatar src={profile.avatarUrl} fallback={initials(profile.name)} className="h-24 w-24 ring-4 ring-white" />
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-ink-900">{profile.name}</h1>
              <p className="text-sm text-ink-500">@{profile.username}</p>
            </div>
          </div>
          {isOwner ? (
            <Badge variant="gold">Ini profil Anda</Badge>
          ) : (
            <Button variant={profile.isFollowedByViewer ? 'secondary' : 'primary'} onClick={onToggleFollow} disabled={isPending}>
              {profile.isFollowedByViewer ? 'Unfollow' : 'Follow'}
            </Button>
          )}
        </div>
        <p className="max-w-3xl text-sm leading-7 text-ink-600">{profile.bio}</p>
        <div className="flex flex-wrap gap-3 text-sm text-ink-500">
          <span>{profile.location}</span>
          <span>•</span>
          <span>{profile.website}</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <Badge variant="outline">{profile.followersCount} followers</Badge>
          <Badge variant="outline">{profile.followingCount} following</Badge>
          <Badge variant="outline">{profile.postsCount} post</Badge>
          {profile.isVerified ? <Badge variant="gold">Verified</Badge> : null}
        </div>
      </div>
    </Card>
  )
}

export function FeedList({
  title,
  description,
  posts,
  currentUserId,
  emptyAction,
}: {
  title: string
  description: string
  posts: FeedPost[]
  currentUserId: string
  emptyAction?: React.ReactNode
}) {
  if (!posts.length) {
    return (
      <EmptyState
        title={title}
        description={description}
        action={emptyAction}
      />
    )
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} currentUserId={currentUserId} />
      ))}
    </div>
  )
}
