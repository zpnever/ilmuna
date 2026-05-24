import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Bookmark, Copy, Search } from 'lucide-react'
import { toast } from 'sonner'

import { Badge, Button, Card, EmptyState, Input, SectionHeading, Textarea } from '@/components/ui'
import { useAuth } from '@/context/auth-context'
import {
  getHadithBookmarks,
  getHadithBooks,
  getHadithEntries,
  toggleHadithBookmark,
  updateHadithBookmarkNote,
} from '@/services/hadith-service'

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
        title="Multi-kitab"
        description="Bukhari, Muslim, Abu Dawud, Tirmidzi, Nasa'i, Ibnu Majah, Muwatha, Musnad Ahmad, dan lainnya."
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
              <p className="text-sm text-ink-500">{book.total} hadith tersedia di dataset dummy.</p>
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
  const { bookSlug } = useParams({ from: '/hadith/$bookSlug' })
  const queryClient = useQueryClient()
  const parentRef = useRef<HTMLDivElement | null>(null)
  const [limit, setLimit] = useState(40)
  const entriesQuery = useQuery({
    queryKey: ['hadith-book', bookSlug, limit],
    queryFn: () => getHadithEntries(bookSlug, limit),
  })
  const bookmarkMutation = useMutation({
    mutationFn: (index: number) => toggleHadithBookmark(user!.id, entriesQuery.data![index]),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['hadith-bookmarks', user?.id] })
    },
  })
  const virtualizer = useVirtualizer({
    count: entriesQuery.data?.length ?? 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 240,
    overscan: 5,
  })

  if (!user) {
    return null
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Kitab"
        title={bookSlug}
        description="Daftar hadith dirender secara virtual agar tetap ringan di perangkat mobile."
        action={
          <Button variant="secondary" onClick={() => setLimit((current) => current + 40)}>
            Muat 40 lagi
          </Button>
        }
      />
      <Card className="p-0">
        <div ref={parentRef} className="h-[70vh] overflow-auto rounded-[inherit]">
          <div className="relative" style={{ height: `${virtualizer.getTotalSize()}px` }}>
            {virtualizer.getVirtualItems().map((row) => {
              const entry = entriesQuery.data?.[row.index]
              if (!entry) {
                return null
              }
              return (
                <div
                  key={`${entry.bookSlug}-${entry.number}`}
                  className="absolute left-0 top-0 w-full px-4 py-3"
                  style={{ transform: `translateY(${row.start}px)` }}
                >
                  <Card className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant="gold">Hadith {entry.number}</Badge>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={async () => {
                            await navigator.clipboard.writeText(`${entry.arabic}\n${entry.translation}`)
                            toast.success('Hadith disalin.')
                          }}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Salin
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => bookmarkMutation.mutate(row.index)}>
                          <Bookmark className="mr-2 h-4 w-4" />
                          Bookmark
                        </Button>
                      </div>
                    </div>
                    <p dir="rtl" className="text-right text-[26px] leading-loose text-ink-900">
                      {entry.arabic}
                    </p>
                    <p className="text-sm leading-7 text-ink-600">{entry.translation}</p>
                  </Card>
                </div>
              )
            })}
          </div>
        </div>
      </Card>
    </div>
  )
}

export function HadithBookmarksScreen() {
  const { user } = useAuth()
  const [notes, setNotes] = useState<Record<string, string>>({})
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
      <SectionHeading
        eyebrow="Bookmarks"
        title="Hadith yang Anda simpan"
        description="Bookmark per hadith lengkap dengan catatan personal untuk memudahkan rujukan ulang."
      />
      {bookmarksQuery.data?.length ? (
        bookmarksQuery.data.map((bookmark) => (
          <Card key={bookmark.id} className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="gold">
                {bookmark.bookName} · no. {bookmark.hadithNumber}
              </Badge>
            </div>
            <p dir="rtl" className="text-right text-[26px] leading-loose text-ink-900">
              {bookmark.arabicText}
            </p>
            <p className="text-sm leading-7 text-ink-600">{bookmark.translation}</p>
            <Textarea
              value={notes[bookmark.id] ?? bookmark.note}
              onChange={(event) => setNotes((current) => ({ ...current, [bookmark.id]: event.target.value }))}
              placeholder="Catatan pribadi..."
            />
            <Button
              variant="secondary"
              onClick={() =>
                noteMutation.mutate({
                  id: bookmark.id,
                  note: notes[bookmark.id] ?? bookmark.note,
                })
              }
            >
              Simpan catatan
            </Button>
          </Card>
        ))
      ) : (
        <EmptyState title="Belum ada bookmark hadith" description="Simpan hadith dari halaman kitab untuk melihatnya di sini." />
      )}
    </div>
  )
}
