import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { BookMarked, BookOpen, Library } from 'lucide-react'

import { Button, Card, EmptyState, SectionHeading, TabsContent, TabsList, TabsRoot, TabsTrigger, Textarea } from '@/components/ui'
import { getReferenceBookmarks } from '@/services/reference-service'
import { updateHadithBookmarkNote } from '@/services/hadith-service'
import { updateQuranBookmarkNote } from '@/services/quran-service'

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
  const queryClient = useQueryClient()
  const bookmarksQuery = useQuery({
    queryKey: ['reference-bookmarks'],
    queryFn: getReferenceBookmarks,
  })
  const quranNoteMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => updateQuranBookmarkNote(id, note),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['reference-bookmarks'] })
    },
  })
  const hadithNoteMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => updateHadithBookmarkNote(id, note),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['reference-bookmarks'] })
    },
  })

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Bookmark"
        title="Semua bookmark referensi"
        description="Ayat dan hadith yang Anda simpan ditampilkan dalam satu tempat."
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
                <p className="text-sm font-semibold text-ink-900">
                  {bookmark.surahName} • Ayat {bookmark.ayahNumber}
                </p>
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
                <p className="text-sm font-semibold text-ink-900">
                  {bookmark.bookName} • Hadith {bookmark.hadithNumber}
                </p>
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
