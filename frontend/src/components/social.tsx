import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Heart,
  ImagePlus,
  MessageCircle,
  Plus,
  Send,
  Share2,
  ThumbsDown,
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
  Textarea,
} from '@/components/ui'
import { markdownToHtml, relativeTime } from '@/lib/utils'
import {
  addComment,
  createPost,
  getComments,
  reportPost,
  sharePost,
  toggleReaction,
  type FeedPost,
} from '@/services/post-service'
import { getSurahDetail, getSurahList } from '@/services/quran-service'
import type { Ayah, CommentThread, PostContentBlock, Profile, QuranQuoteBlock } from '@/types/domain'

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
}

type ComposerMarkdownBlock = {
  id: string
  type: 'markdown'
  markdown: string
}

type ComposerQuoteBlock = QuranQuoteBlock & {
  id: string
}

type ComposerBlock = ComposerMarkdownBlock | ComposerQuoteBlock

function makeComposerId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
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

function buildPostBlocks(blocks: ComposerBlock[], images: string[]): PostContentBlock[] {
  const content = blocks
    .map<PostContentBlock | null>((block) => {
      if (block.type === 'markdown') {
        if (!block.markdown.trim()) {
          return null
        }
        return {
          type: 'markdown',
          markdown: block.markdown.trim(),
        }
      }

      const { id: _id, ...quote } = block
      return quote
    })
    .filter((block): block is PostContentBlock => Boolean(block))

  if (images.length) {
    content.push({
      type: 'images',
      images,
    })
  }

  return content
}

function hasComposerContent(blocks: ComposerBlock[], images: string[]) {
  return blocks.some((block) => block.type === 'quranQuote' || block.markdown.trim()) || images.length > 0
}

function renderPostPreviewText(post: FeedPost) {
  return post.content
    .map((block) => {
      if (block.type === 'markdown') {
        return block.markdown
      }
      if (block.type === 'quranQuote') {
        return block.translation
      }
      return ''
    })
    .join('\n')
}

function isLongPost(post: FeedPost) {
  return renderPostPreviewText(post).length > 420
}

export function QuranQuotePreview({ quote }: { quote: QuranQuoteBlock }) {
  return (
    <Card className="border-gold-400/40 bg-gold-400/8 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-gold-500">
        <BookOpen className="h-4 w-4" />
        Kutipan Al-Qur&apos;an
      </div>
      <p dir="rtl" className="mt-3 text-right text-2xl leading-loose text-ink-900">
        {quote.arabic}
      </p>
      <p className="mt-2 text-sm leading-7 text-ink-600">{quote.translation}</p>
      <p className="mt-3 text-xs font-semibold text-ink-500">
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
      return items.slice(0, 16)
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
          <DialogTitle className="text-xl font-semibold text-ink-900">Sisipkan ayat</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-ink-500">
            Ayat bisa disisipkan lebih dari satu kali di posisi mana pun.
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
                placeholder="Nomor ayat atau kata terjemahan"
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
                  }}
                >
                  <p dir="rtl" className="text-right text-2xl text-ink-900">
                    {ayah.arabic}
                  </p>
                  <p className="mt-2 text-sm text-ink-600">{ayah.translation}</p>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CommentSection({ postId, currentUserId }: { postId: string; currentUserId: string }) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState('')
  const commentsQuery = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => getComments(postId),
  })
  const mutation = useMutation({
    mutationFn: () => addComment(postId, currentUserId, draft, null),
    onSuccess: async () => {
      setDraft('')
      await queryClient.invalidateQueries({ queryKey: ['comments', postId] })
      await queryClient.invalidateQueries({ queryKey: ['feed'] })
      await queryClient.invalidateQueries({ queryKey: ['explore'] })
      await queryClient.invalidateQueries({ queryKey: ['profile'] })
      await queryClient.invalidateQueries({ queryKey: ['post', postId] })
    },
  })

  const comments = commentsQuery.data ?? []
  const topLevel = comments.filter((comment) => !comment.parentId)
  const repliesByParent = comments.reduce<Record<string, CommentThread[]>>((accumulator, comment) => {
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
          onClick={() => mutation.mutate()}
        >
          Kirim
        </Button>
      </div>
      <div className="space-y-3">
        {topLevel.map((comment) => (
          <div key={comment.id} className="rounded-3xl bg-black/3 p-4">
            <p className="text-sm text-ink-700">{comment.content}</p>
            <p className="mt-2 text-xs text-ink-400">{relativeTime(comment.createdAt)}</p>
            {repliesByParent[comment.id]?.length ? (
              <div className="mt-3 space-y-2 border-l border-gold-400/30 pl-4">
                {repliesByParent[comment.id].map((reply) => (
                  <div key={reply.id} className="rounded-2xl bg-white px-3 py-3 text-sm text-ink-600">
                    {reply.content}
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

function PostBlocks({ post, expanded }: { post: FeedPost; expanded: boolean }) {
  const blocks = expanded ? post.content : truncateBlocks(post.content)

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        if (block.type === 'markdown') {
          return (
            <div
              key={`${post.id}-markdown-${index}`}
              className="prose prose-sm max-w-none text-ink-700 prose-headings:text-ink-900 prose-p:leading-8"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(block.markdown) }}
            />
          )
        }

        if (block.type === 'quranQuote') {
          return <QuranQuotePreview key={`${post.id}-quote-${index}`} quote={block} />
        }

        return (
          <div key={`${post.id}-images-${index}`} className="grid gap-3 sm:grid-cols-2">
            {block.images.map((image, imageIndex) => (
              <img
                key={`${post.id}-image-${imageIndex}`}
                src={image}
                alt="Post"
                className="h-64 w-full rounded-[1.5rem] object-cover"
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}

function truncateBlocks(blocks: PostContentBlock[]) {
  let remaining = 380
  const result: PostContentBlock[] = []

  for (const block of blocks) {
    if (block.type !== 'markdown') {
      result.push(block)
      continue
    }

    if (remaining <= 0) {
      break
    }

    const nextMarkdown = block.markdown.slice(0, remaining)
    result.push({ ...block, markdown: nextMarkdown })
    remaining -= nextMarkdown.length
  }

  return result
}

export function PostComposerDialog({
  currentUserId: _currentUserId,
  trigger,
}: {
  currentUserId: string
  trigger: React.ReactNode
}) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [tags, setTags] = useState('')
  const [blocks, setBlocks] = useState<ComposerBlock[]>([
    { id: makeComposerId('markdown'), type: 'markdown', markdown: '' },
  ])
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)

  const createPostMutation = useMutation({
    mutationFn: () =>
      createPost({
        blocks: buildPostBlocks(blocks, images),
        images,
        tags: tags
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean),
      }),
    onSuccess: async () => {
      toast.success('Postingan berhasil dibagikan.')
      setBlocks([{ id: makeComposerId('markdown'), type: 'markdown', markdown: '' }])
      setImages([])
      setTags('')
      setOpen(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['feed'] }),
        queryClient.invalidateQueries({ queryKey: ['explore'] }),
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
      ])
    },
  })

  function updateMarkdownBlock(id: string, markdown: string) {
    setBlocks((current) =>
      current.map((block) => (block.id === id && block.type === 'markdown' ? { ...block, markdown } : block)),
    )
    setActiveBlockId(id)
  }

  function addMarkdownBlock(afterId?: string) {
    const nextBlock: ComposerMarkdownBlock = {
      id: makeComposerId('markdown'),
      type: 'markdown',
      markdown: '',
    }
    setBlocks((current) => {
      if (!afterId) {
        return [...current, nextBlock]
      }
      const index = current.findIndex((block) => block.id === afterId)
      return [...current.slice(0, index + 1), nextBlock, ...current.slice(index + 1)]
    })
    setActiveBlockId(nextBlock.id)
  }

  function removeBlock(id: string) {
    setBlocks((current) => {
      const remaining = current.filter((block) => block.id !== id)
      return remaining.length ? remaining : [{ id: makeComposerId('markdown'), type: 'markdown', markdown: '' }]
    })
  }

  function insertQuote(quote: QuranQuoteBlock) {
    const nextQuote: ComposerQuoteBlock = { id: makeComposerId('quote'), ...quote }
    const nextMarkdown: ComposerMarkdownBlock = {
      id: makeComposerId('markdown'),
      type: 'markdown',
      markdown: '',
    }

    setBlocks((current) => {
      const activeIndex = activeBlockId ? current.findIndex((block) => block.id === activeBlockId) : current.length - 1
      const insertAt = activeIndex === -1 ? current.length : activeIndex + 1
      return [...current.slice(0, insertAt), nextQuote, nextMarkdown, ...current.slice(insertAt)]
    })
    setActiveBlockId(nextMarkdown.id)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <div onClick={() => setOpen(true)}>{trigger}</div>
        <DialogContent className="max-h-[88vh] overflow-auto">
          <DialogTitle className="text-2xl font-semibold text-ink-900">Buat postingan</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-ink-500">
            Markdown langsung dirender saat postingan tampil. Gunakan blok tambahan bila ingin menyisipkan ayat.
          </DialogDescription>
          <div className="mt-6 space-y-4">
            {blocks.map((block) =>
              block.type === 'markdown' ? (
                <div key={block.id} className="space-y-2">
                  <Textarea
                    value={block.markdown}
                    onChange={(event) => updateMarkdownBlock(block.id, event.target.value)}
                    onFocus={() => setActiveBlockId(block.id)}
                    placeholder="Tulis isi postingan. Contoh: **tebal**, _miring_, - daftar"
                    className="min-h-32 rounded-[1.75rem] border border-black/8 px-5 py-4 leading-7 focus:border-black/8 focus:ring-0"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => addMarkdownBlock(block.id)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Tambah blok teks
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setPickerOpen(true)}>
                      <BookOpen className="mr-2 h-4 w-4" />
                      Sisipkan ayat
                    </Button>
                    {blocks.length > 1 ? (
                      <Button size="sm" variant="ghost" onClick={() => removeBlock(block.id)}>
                        Hapus blok
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div key={block.id} className="space-y-2">
                  <QuranQuotePreview quote={block} />
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => addMarkdownBlock(block.id)}>
                      Tambah teks setelah ayat
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => removeBlock(block.id)}>
                      Hapus kutipan
                    </Button>
                  </div>
                </div>
              ),
            )}

            <div className="grid gap-4 md:grid-cols-[1fr_220px]">
              <label className="space-y-2 text-sm font-medium text-ink-700">
                <span>Tag</span>
                <Input
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="tafsir, komunitas, akhlak"
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-ink-700">
                <span>Gambar</span>
                <div className="flex items-center gap-2">
                  <label className="flex h-11 cursor-pointer items-center justify-center rounded-full border border-black/10 px-4 text-sm font-medium text-ink-700 transition hover:bg-black/5">
                    <ImagePlus className="mr-2 h-4 w-4" />
                    Pilih gambar
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(event) => {
                        if (!event.target.files?.length) {
                          return
                        }
                        void filesToDataUrls(event.target.files)
                          .then((nextImages) => setImages(nextImages))
                          .catch((error: Error) => toast.error(error.message))
                      }}
                    />
                  </label>
                </div>
              </label>
            </div>

            {images.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {images.map((image, index) => (
                  <img key={index} src={image} alt="Preview" className="h-52 w-full rounded-[1.5rem] object-cover" />
                ))}
              </div>
            ) : null}

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button
                disabled={!hasComposerContent(blocks, images) || createPostMutation.isPending}
                onClick={() => createPostMutation.mutate()}
              >
                <Send className="mr-2 h-4 w-4" />
                Kirim postingan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <QuranPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} onSelect={insertQuote} />
    </>
  )
}

export function PostCard({ post, currentUserId, showComments = false }: { post: FeedPost; currentUserId: string; showComments?: boolean }) {
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState(!isLongPost(post))
  const [commentsOpen, setCommentsOpen] = useState(showComments)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')

  const reactionMutation = useMutation({
    mutationFn: (type: 'like' | 'dislike') => toggleReaction(post.id, currentUserId, type),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['feed'] }),
        queryClient.invalidateQueries({ queryKey: ['explore'] }),
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
        queryClient.invalidateQueries({ queryKey: ['post', post.id] }),
      ])
    },
  })

  const reportMutation = useMutation({
    mutationFn: () => reportPost(post.id, reportReason),
    onSuccess: async () => {
      toast.success('Laporan terkirim.')
      setReportOpen(false)
      setReportReason('')
      await queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] })
    },
  })

  async function handleShare() {
    const url = `${window.location.origin}/posts/${post.id}`

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${post.authorName} di Ilmuna`,
          text: renderPostPreviewText(post).slice(0, 120),
          url,
        })
      } else {
        await navigator.clipboard.writeText(url)
        toast.success('Tautan postingan disalin.')
      }
      await sharePost(post.id)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['feed'] }),
        queryClient.invalidateQueries({ queryKey: ['explore'] }),
        queryClient.invalidateQueries({ queryKey: ['post', post.id] }),
      ])
    } catch {
      toast.error('Berbagi postingan dibatalkan.')
    }
  }

  return (
    <Card className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar src={post.authorAvatar} fallback={initials(post.authorName)} />
          <div>
            <Link
              to="/profile/$username"
              params={{ username: post.authorUsername }}
              className="font-semibold text-ink-900"
            >
              {post.authorName}
            </Link>
            <p className="text-xs text-ink-400">
              @{post.authorUsername} • {relativeTime(post.createdAt)}
            </p>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setReportOpen(true)}>
          <AlertTriangle className="mr-2 h-4 w-4" />
          Report
        </Button>
      </div>

      <PostBlocks post={post} expanded={expanded} />

      {isLongPost(post) ? (
        <button
          type="button"
          className="inline-flex items-center text-sm font-semibold text-gold-500"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? (
            <>
              <ChevronUp className="mr-1 h-4 w-4" />
              Tampilkan lebih sedikit
            </>
          ) : (
            <>
              <ChevronDown className="mr-1 h-4 w-4" />
              Baca selengkapnya
            </>
          )}
        </button>
      ) : null}

      {post.tags.length ? (
        <div className="flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <Badge key={tag} variant="gold">
              #{tag}
            </Badge>
          ))}
        </div>
      ) : null}

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
        <Button size="sm" variant="secondary" onClick={() => void handleShare()}>
          <Share2 className="mr-2 h-4 w-4" />
          {post.shareCount}
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link to="/posts/$postId" params={{ postId: post.id }}>
            Detail
          </Link>
        </Button>
      </div>

      {commentsOpen ? <CommentSection postId={post.id} currentUserId={currentUserId} /> : null}

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle className="text-xl font-semibold text-ink-900">Laporkan postingan</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-ink-500">
            Jelaskan alasan laporan agar admin dapat meninjau dengan cepat.
          </DialogDescription>
          <Textarea
            value={reportReason}
            onChange={(event) => setReportReason(event.target.value)}
            placeholder="Tuliskan alasan laporan"
            className="mt-4 rounded-[1.5rem] focus:border-black/8 focus:ring-0"
          />
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setReportOpen(false)}>
              Batal
            </Button>
            <Button
              variant="danger"
              disabled={reportReason.trim().length < 5 || reportMutation.isPending}
              onClick={() => reportMutation.mutate()}
            >
              Kirim laporan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export function FeedList({
  posts,
  currentUserId,
  title,
  description,
  emptyAction,
}: {
  posts: FeedPost[]
  currentUserId: string
  title: string
  description: string
  emptyAction?: React.ReactNode
}) {
  if (!posts.length) {
    return <EmptyState title={title} description={description} action={emptyAction} />
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} currentUserId={currentUserId} />
      ))}
    </div>
  )
}

export function ProfileHeader({
  profile,
  isOwner,
  onFollow,
}: {
  profile: Profile
  isOwner: boolean
  onFollow: () => void
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="h-44 bg-cover bg-center" style={{ backgroundImage: `url(${profile.coverUrl})` }} />
      <div className="space-y-4 px-5 py-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar src={profile.avatarUrl} fallback={initials(profile.name)} className="-mt-16 h-24 w-24 ring-4 ring-white" />
            <div>
              <h1 className="text-2xl font-semibold text-ink-900">{profile.name}</h1>
              <p className="text-sm text-ink-500">@{profile.username}</p>
            </div>
          </div>
          {!isOwner ? (
            <Button onClick={onFollow}>{profile.isFollowedByViewer ? 'Unfollow' : 'Follow'}</Button>
          ) : null}
        </div>
        <p className="text-sm leading-7 text-ink-600">{profile.bio}</p>
        <div className="flex flex-wrap gap-4 text-sm text-ink-500">
          <span>{profile.followersCount} pengikut</span>
          <span>{profile.followingCount} mengikuti</span>
          <span>{profile.postsCount} postingan</span>
        </div>
      </div>
    </Card>
  )
}
