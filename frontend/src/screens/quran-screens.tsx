import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, Bookmark, Search } from 'lucide-react'

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

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Al-Qur'an"
        title="114 surah"
        description="Pilih surah untuk membaca ayat dari backend referensi."
        action={
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-11" placeholder="Cari surah atau nomor" />
          </div>
        }
      />
      <div className="grid gap-4">
        {filtered.map((surah) => (
          <Link
            key={surah.number}
            to="/quran/$surahNumber"
            params={{ surahNumber: String(surah.number) }}
            className="rounded-[1.5rem] border border-black/8 bg-white px-4 py-4 transition hover:border-gold-400/30 hover:bg-gold-400/5"
          >
            <div className="flex items-center justify-between gap-4">
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
            </div>
          </Link>
        ))}
      </div>
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
    <Card className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Badge variant="gold">Ayat {ayah.ayahNumber}</Badge>
        <Button
          size="sm"
          variant="secondary"
          className="mt-1 shrink-0"
          onClick={() => bookmarkMutation.mutate()}
        >
          <Bookmark className="mr-2 h-4 w-4" />
          Bookmark
        </Button>
      </div>
      <p dir="rtl" className="pr-2 text-right text-[28px] leading-loose text-ink-900">
        {ayah.arabic}
      </p>
      <p className="text-sm leading-8 text-ink-600">{ayah.translation}</p>
    </Card>
  )
}

export function QuranSurahScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { surahNumber } = useParams({ from: '/quran/$surahNumber' })
  const number = Number(surahNumber)
  const [ayahSearch, setAyahSearch] = useState('')
  const detailQuery = useQuery({
    queryKey: ['quran', 'detail', number],
    queryFn: () => getSurahDetail(number),
  })

  if (!user || !detailQuery.data) {
    return null
  }

  const previous = number > 1 ? number - 1 : null
  const next = number < 114 ? number + 1 : null
  const visibleAyahs = detailQuery.data.ayahs.filter((ayah) => {
    const term = ayahSearch.trim().toLowerCase()
    if (!term) {
      return true
    }
    return String(ayah.ayahNumber).includes(term) || ayah.translation.toLowerCase().includes(term)
  })

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
          <Button variant="secondary" onClick={() => void navigate({ to: '/quran' })}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
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
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <Input
            value={ayahSearch}
            onChange={(event) => setAyahSearch(event.target.value)}
            className="pl-11"
            placeholder="Cari nomor ayat atau terjemahan"
          />
        </div>
      </Card>
      <div className="space-y-4">
        {visibleAyahs.map((ayah) => (
          <AyahCard key={ayah.ayahNumber} ayah={ayah} currentUserId={user.id} />
        ))}
      </div>
    </div>
  )
}

export function QuranBookmarksScreen() {
  const { user } = useAuth()
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
      <SectionHeading eyebrow="Bookmark" title="Ayat yang Anda simpan" />
      {bookmarksQuery.data?.length ? (
        <div className="space-y-4">
          {bookmarksQuery.data.map((bookmark) => (
            <Card key={bookmark.id} className="space-y-4">
              <Badge variant="gold">
                {bookmark.surahName} • {bookmark.ayahNumber}
              </Badge>
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
        <EmptyState title="Belum ada bookmark Qur'an" description="Simpan ayat penting untuk dibaca kembali." />
      )}
    </div>
  )
}
