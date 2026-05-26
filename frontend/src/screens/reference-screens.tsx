import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, BookMarked, BookOpen, Bookmark, Library } from 'lucide-react'

import { Button, Card, EmptyState, SectionHeading, TabsContent, TabsList, TabsRoot, TabsTrigger, Textarea } from '@/components/ui'
import { useAuth } from '@/context/auth-context'
import { toggleHadithBookmark, updateHadithBookmarkNote } from '@/services/hadith-service'
import { toggleQuranBookmark, updateQuranBookmarkNote } from '@/services/quran-service'
import { getReferenceBookmarks } from '@/services/reference-service'
import type { HadithBookmark, QuranBookmark } from '@/types/domain'

export function ReferencesHubScreen() {
  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Referensi"
        title="Pilih sumber yang ingin Anda buka"
        description="Semua data referensi dibaca dari backend internal agar tetap ringan di sisi browser."
        action={
          <Button asChild variant="secondary">
            <Link to="/references/bookmarks">
              <BookMarked className="mr-2 h-4 w-4" />
              Bookmark
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gold-400/15 text-gold-500">
            <BookOpen className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-ink-900">Al-Qur&apos;an</h2>
            <p className="text-sm leading-7 text-ink-500">
              Jelajahi surah, buka detail ayat, lalu simpan bookmark penting Anda.
            </p>
          </div>
          <Button asChild>
            <Link to="/quran">Buka Al-Qur&apos;an</Link>
          </Button>
        </Card>
        <Card className="space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gold-400/15 text-gold-500">
            <Library className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-ink-900">Hadith</h2>
            <p className="text-sm leading-7 text-ink-500">
              Pilih kitab hadith dan lanjutkan membaca per 40 entri secara bertahap.
            </p>
          </div>
          <Button asChild>
            <Link to="/hadith">Buka Hadith</Link>
          </Button>
        </Card>
      </div>
    </div>
  )
}

export function ReferencesBookmarksScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const bookmarksQuery = useQuery({
    queryKey: ['reference-bookmarks'],
    queryFn: getReferenceBookmarks,
  })
  const quranNoteMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => updateQuranBookmarkNote(id, note),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['reference-bookmarks'] })
      await queryClient.invalidateQueries({ queryKey: ['quran-bookmarks', user?.id] })
    },
  })
  const hadithNoteMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => updateHadithBookmarkNote(id, note),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['reference-bookmarks'] })
      await queryClient.invalidateQueries({ queryKey: ['hadith-bookmarks', user?.id] })
    },
  })
  const removeQuranMutation = useMutation({
    mutationFn: (bookmark: QuranBookmark) =>
      toggleQuranBookmark(
        user!.id,
        {
          surahNumber: bookmark.surahNumber,
          ayahNumber: bookmark.ayahNumber,
          surahName: bookmark.surahName,
          arabicText: bookmark.arabicText,
          translation: bookmark.translation,
        },
        bookmark.note,
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['reference-bookmarks'] }),
        queryClient.invalidateQueries({ queryKey: ['quran-bookmarks', user?.id] }),
      ])
    },
  })
  const removeHadithMutation = useMutation({
    mutationFn: (bookmark: HadithBookmark) =>
      toggleHadithBookmark(
        user!.id,
        {
          bookSlug: bookmark.bookSlug,
          bookName: bookmark.bookName,
          number: bookmark.hadithNumber,
          arabic: bookmark.arabicText,
          translation: bookmark.translation,
        },
        bookmark.note,
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['reference-bookmarks'] }),
        queryClient.invalidateQueries({ queryKey: ['hadith-bookmarks', user?.id] }),
      ])
    },
  })

  if (!user) {
    return null
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Bookmark"
        title="Semua bookmark referensi"
        description="Ayat dan hadith yang Anda simpan ditampilkan dalam satu tempat."
        action={
          <Button variant="secondary" onClick={() => void navigate({ to: '/references' })}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        }
      />
      <TabsRoot defaultValue="quran">
        <TabsList>
          <TabsTrigger value="quran">Al-Qur&apos;an</TabsTrigger>
          <TabsTrigger value="hadith">Hadith</TabsTrigger>
        </TabsList>
        <TabsContent value="quran" className="mt-6 space-y-4">
          {bookmarksQuery.data?.quran.length ? (
            bookmarksQuery.data.quran.map((bookmark) => (
              <Card key={bookmark.id} className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-ink-900">
                    {bookmark.surahName} • Ayat {bookmark.ayahNumber}
                  </p>
                  <Button size="sm" variant="secondary" onClick={() => removeQuranMutation.mutate(bookmark)}>
                    <Bookmark className="mr-2 h-4 w-4" />
                    Hapus bookmark
                  </Button>
                </div>
                <p dir="rtl" className="text-right text-2xl leading-loose text-ink-900">
                  {bookmark.arabicText}
                </p>
                <p className="text-sm leading-8 text-ink-600">{bookmark.translation}</p>
                <Textarea
                  defaultValue={bookmark.note}
                  className="rounded-[1.5rem] focus:border-black/8 focus:ring-0"
                  placeholder="Catatan pribadi"
                  onBlur={(event) => quranNoteMutation.mutate({ id: bookmark.id, note: event.target.value })}
                />
              </Card>
            ))
          ) : (
            <EmptyState title="Belum ada bookmark Qur'an" description="Simpan ayat penting untuk dibaca kembali." />
          )}
        </TabsContent>
        <TabsContent value="hadith" className="mt-6 space-y-4">
          {bookmarksQuery.data?.hadith.length ? (
            bookmarksQuery.data.hadith.map((bookmark) => (
              <Card key={bookmark.id} className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-ink-900">
                    {bookmark.bookName} • Hadith {bookmark.hadithNumber}
                  </p>
                  <Button size="sm" variant="secondary" onClick={() => removeHadithMutation.mutate(bookmark)}>
                    <Bookmark className="mr-2 h-4 w-4" />
                    Hapus bookmark
                  </Button>
                </div>
                <p dir="rtl" className="text-right text-2xl leading-loose text-ink-900">
                  {bookmark.arabicText}
                </p>
                <p className="text-sm leading-8 text-ink-600">{bookmark.translation}</p>
                <Textarea
                  defaultValue={bookmark.note}
                  className="rounded-[1.5rem] focus:border-black/8 focus:ring-0"
                  placeholder="Catatan pribadi"
                  onBlur={(event) => hadithNoteMutation.mutate({ id: bookmark.id, note: event.target.value })}
                />
              </Card>
            ))
          ) : (
            <EmptyState title="Belum ada bookmark hadith" description="Simpan hadith penting agar mudah dibaca kembali." />
          )}
        </TabsContent>
      </TabsRoot>
    </div>
  )
}
