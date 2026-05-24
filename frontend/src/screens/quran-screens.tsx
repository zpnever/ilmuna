import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowLeft, ArrowRight, Bookmark, Copy, Search } from 'lucide-react'
import { toast } from 'sonner'

import { Badge, Button, Card, EmptyState, Input, SectionHeading, Textarea } from '@/components/ui'
import { useAuth } from '@/context/auth-context'
import {
  getQuranBookmarks,
  getSurahDetail,
  getSurahList,
  toggleQuranBookmark,
  updateQuranBookmarkNote,
} from '@/services/quran-service'
import type { Ayah } from '@/types/domain'

export function QuranListScreen() {
  const listQuery = useQuery({
    queryKey: ['quran', 'surah-list'],
    queryFn: getSurahList,
  })
  const [search, setSearch] = useState('')
  const parentRef = useRef<HTMLDivElement | null>(null)
  const filtered = useMemo(
    () =>
      (listQuery.data ?? []).filter((surah) => {
        const term = search.trim().toLowerCase()
        if (!term) {
          return true
        }
        return (
          surah.nameLatin.toLowerCase().includes(term) ||
          surah.translationName.toLowerCase().includes(term) ||
          String(surah.number).includes(term)
        )
      }),
    [listQuery.data, search],
  )
  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 96,
    overscan: 8,
  })

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Al-Qur'an"
        title="114 surah"
        description="Daftar surah diringkas menjadi metadata ringan, sedangkan detail ayat diambil saat dibuka."
        action={
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-11" placeholder="Cari surah" />
          </div>
        }
      />
      <Card className="p-0">
        <div ref={parentRef} className="h-[70vh] overflow-auto rounded-[inherit]">
          <div
            className="relative"
            style={{
              height: `${virtualizer.getTotalSize()}px`,
            }}
          >
            {virtualizer.getVirtualItems().map((row) => {
              const surah = filtered[row.index]
              return (
                <div
                  key={surah.number}
                  className="absolute left-0 top-0 w-full px-4 py-3"
                  style={{ transform: `translateY(${row.start}px)` }}
                >
                  <Link
                    to="/quran/$surahNumber"
                    params={{ surahNumber: String(surah.number) }}
                    className="flex items-center justify-between rounded-[1.5rem] border border-black/8 bg-white px-4 py-4 transition hover:border-gold-400/30 hover:bg-gold-400/5"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-ink-900">
                        {surah.number}. {surah.nameLatin}
                      </p>
                      <p className="text-sm text-ink-500">{surah.translationName}</p>
                    </div>
                    <div className="text-right">
                      <p dir="rtl" className="text-2xl text-ink-900">
                        {surah.name}
                      </p>
                      <p className="text-xs text-ink-400">{surah.ayahCount} ayat</p>
                    </div>
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      </Card>
    </div>
  )
}

function AyahCard({ ayah, currentUserId }: { ayah: Ayah; currentUserId: string }) {
  const queryClient = useQueryClient()
  const bookmarkMutation = useMutation({
    mutationFn: () => toggleQuranBookmark(currentUserId, ayah),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['quran-bookmarks', currentUserId] })
    },
  })

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Badge variant="gold">Ayat {ayah.ayahNumber}</Badge>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              await navigator.clipboard.writeText(`${ayah.arabic}\n${ayah.translation}`)
              toast.success('Ayat disalin.')
            }}
          >
            <Copy className="mr-2 h-4 w-4" />
            Salin
          </Button>
          <Button size="sm" variant="secondary" onClick={() => bookmarkMutation.mutate()}>
            <Bookmark className="mr-2 h-4 w-4" />
            Bookmark
          </Button>
        </div>
      </div>
      <p dir="rtl" className="text-right text-[28px] leading-loose text-ink-900">
        {ayah.arabic}
      </p>
      <p className="text-sm leading-7 text-ink-600">{ayah.translation}</p>
    </Card>
  )
}

export function QuranSurahScreen() {
  const { user } = useAuth()
  const { surahNumber } = useParams({ from: '/quran/$surahNumber' })
  const number = Number(surahNumber)
  const detailQuery = useQuery({
    queryKey: ['quran', 'detail', number],
    queryFn: () => getSurahDetail(number),
  })

  if (!user || !detailQuery.data) {
    return null
  }

  const previous = number > 1 ? number - 1 : null
  const next = number < 114 ? number + 1 : null

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gold-500">Surah</p>
            <h1 className="text-3xl font-semibold text-ink-900">{detailQuery.data.nameLatin}</h1>
            <p className="mt-1 text-sm text-ink-500">{detailQuery.data.translationName}</p>
          </div>
          <p dir="rtl" className="text-4xl text-ink-900">
            {detailQuery.data.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {previous ? (
            <Button asChild variant="secondary">
              <Link to="/quran/$surahNumber" params={{ surahNumber: String(previous) }}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Surah sebelumnya
              </Link>
            </Button>
          ) : null}
          {next ? (
            <Button asChild variant="secondary">
              <Link to="/quran/$surahNumber" params={{ surahNumber: String(next) }}>
                Surah berikutnya
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : null}
        </div>
      </Card>

      <div className="space-y-4">
        {detailQuery.data.ayahs.map((ayah) => (
          <AyahCard key={ayah.ayahNumber} ayah={ayah} currentUserId={user.id} />
        ))}
      </div>
    </div>
  )
}

export function QuranBookmarksScreen() {
  const { user } = useAuth()
  const [notes, setNotes] = useState<Record<string, string>>({})
  const queryClient = useQueryClient()
  const bookmarksQuery = useQuery({
    queryKey: ['quran-bookmarks', user?.id],
    queryFn: () => getQuranBookmarks(user!.id),
    enabled: Boolean(user?.id),
  })
  const noteMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => updateQuranBookmarkNote(id, note),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['quran-bookmarks', user?.id] })
    },
  })

  if (!user) {
    return null
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Bookmarks"
        title="Ayat yang Anda simpan"
        description="Setiap bookmark bisa diberi catatan pribadi untuk kebutuhan tadabbur atau hafalan."
      />
      {bookmarksQuery.data?.length ? (
        bookmarksQuery.data.map((bookmark) => (
          <Card key={bookmark.id} className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="gold">
                {bookmark.surahName} · ayat {bookmark.ayahNumber}
              </Badge>
            </div>
            <p dir="rtl" className="text-right text-[28px] leading-loose text-ink-900">
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
        <EmptyState title="Belum ada bookmark ayat" description="Simpan ayat dari halaman surah untuk melihatnya di sini." />
      )}
    </div>
  )
}
