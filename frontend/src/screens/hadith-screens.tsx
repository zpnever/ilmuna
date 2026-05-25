import { useEffect, useMemo, useRef, useState } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft, Bookmark, Search } from 'lucide-react'

import { Badge, Button, Card, EmptyState, Input, SectionHeading, Textarea } from '@/components/ui'
import { useAuth } from '@/context/auth-context'
import {
  getHadithBookmarks,
  getHadithBooks,
  getHadithEntriesSearch,
  toggleHadithBookmark,
  updateHadithBookmarkNote,
} from '@/services/hadith-service'

function useInfiniteLoadMore(
  enabled: boolean,
  onLoad: () => void,
) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!enabled || !ref.current) {
      return
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        onLoad()
      }
    }, { rootMargin: '500px 0px' })

    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [enabled, onLoad])

  return ref
}

export function HadithBooksScreen() {
  const [search, setSearch] = useState('')
  const booksQuery = useQuery({
    queryKey: ['hadith-books'],
    queryFn: getHadithBooks,
  })

  const visibleBooks = useMemo(
    () =>
      (booksQuery.data ?? []).filter((book) => {
        const term = search.trim().toLowerCase()
        if (!term) {
          return true
        }
        return book.name.toLowerCase().includes(term) || book.slug.toLowerCase().includes(term)
      }),
    [booksQuery.data, search],
  )

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Hadith"
        title="Pilih kitab"
        description="Kitab dimuat dari backend internal dan entri hadith diambil bertahap."
        action={
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-11" placeholder="Cari kitab" />
          </div>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibleBooks.map((book) => (
          <Card key={book.slug} className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-ink-900">{book.name}</h2>
              <p className="text-sm text-ink-500">{book.total} hadith tersedia.</p>
            </div>
            <Button asChild>
              <Link to="/hadith/$bookSlug" params={{ bookSlug: book.slug }}>
                Buka kitab
              </Link>
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function HadithBookScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { bookSlug } = useParams({ from: '/hadith/$bookSlug' })
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const entriesQuery = useInfiniteQuery({
    queryKey: ['hadith-book', bookSlug, search],
    queryFn: ({ pageParam }) => getHadithEntriesSearch(bookSlug, search, 40, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.offset + lastPage.items.length : undefined),
    enabled: Boolean(user),
  })

  const allItems = useMemo(
    () => entriesQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [entriesQuery.data?.pages],
  )
  const loadMoreRef = useInfiniteLoadMore(
    Boolean(entriesQuery.hasNextPage && !entriesQuery.isFetchingNextPage),
    () => void entriesQuery.fetchNextPage(),
  )

  const bookmarkMutation = useMutation({
    mutationFn: (entryIndex: number) => toggleHadithBookmark(user!.id, allItems[entryIndex]),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['hadith-bookmarks', user?.id] })
    },
  })

  if (!user) {
    return null
  }

  const title = entriesQuery.data?.pages[0]?.bookName ?? bookSlug

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Kitab"
        title={title}
        description="Hadith dimuat 40 per halaman dan akan menambah batch berikutnya saat Anda mendekati akhir daftar."
        action={
          <Button variant="secondary" onClick={() => void navigate({ to: '/hadith' })}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        }
      />
      <div className="relative w-full sm:w-80">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-11"
          placeholder="Cari nomor atau isi hadith"
        />
      </div>
      <div className="space-y-4">
        {allItems.map((entry, index) => (
          <Card key={`${entry.bookSlug}-${entry.number}`} className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <Badge variant="gold">Hadith {entry.number}</Badge>
              <Button
                size="sm"
                variant="secondary"
                className="mt-1 shrink-0"
                onClick={() => bookmarkMutation.mutate(index)}
              >
                <Bookmark className="mr-2 h-4 w-4" />
                Bookmark
              </Button>
            </div>
            <p dir="rtl" className="text-right text-[28px] leading-loose text-ink-900">
              {entry.arabic}
            </p>
            <p className="text-sm leading-8 text-ink-600">{entry.translation}</p>
          </Card>
        ))}
        <div ref={loadMoreRef} />
        {entriesQuery.isFetchingNextPage ? (
          <Card className="text-center text-sm text-ink-500">Memuat hadith berikutnya...</Card>
        ) : null}
      </div>
    </div>
  )
}

export function HadithBookmarksScreen() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const bookmarksQuery = useQuery({
    queryKey: ['hadith-bookmarks', user?.id],
    queryFn: () => getHadithBookmarks(user!.id),
    enabled: Boolean(user?.id),
  })
  const noteMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => updateHadithBookmarkNote(id, note),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['hadith-bookmarks', user?.id] })
    },
  })

  if (!user) {
    return null
  }

  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="Bookmark" title="Hadith yang Anda simpan" />
      {bookmarksQuery.data?.length ? (
        <div className="space-y-4">
          {bookmarksQuery.data.map((bookmark) => (
            <Card key={bookmark.id} className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <Badge variant="gold">
                  {bookmark.bookName} • {bookmark.hadithNumber}
                </Badge>
              </div>
              <p dir="rtl" className="text-right text-2xl leading-loose text-ink-900">
                {bookmark.arabicText}
              </p>
              <p className="text-sm leading-8 text-ink-600">{bookmark.translation}</p>
              <Textarea
                defaultValue={bookmark.note}
                className="rounded-[1.5rem] focus:border-black/8 focus:ring-0"
                placeholder="Catatan pribadi"
                onBlur={(event) => noteMutation.mutate({ id: bookmark.id, note: event.target.value })}
              />
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Belum ada bookmark hadith"
          description="Simpan hadith penting agar mudah dibaca kembali."
        />
      )}
    </div>
  )
}
