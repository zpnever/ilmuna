import { apiRequest } from '@/lib/api'
import type { Ayah, QuranBookmark, SurahDetail, SurahSummary } from '@/types/domain'

type QuranBookmarkSource = Pick<
  Ayah,
  'surahNumber' | 'ayahNumber' | 'translation'
> & {
  surahName?: string
  surahNameLatin?: string
  arabic?: string
  arabicText?: string
}

export async function getSurahList() {
  return apiRequest<SurahSummary[]>('/references/quran/surahs', undefined, false)
}

export async function getSurahDetail(surahNumber: number): Promise<SurahDetail> {
  return apiRequest<SurahDetail>(`/references/quran/surahs/${surahNumber}`, undefined, false)
}

export async function searchAyah(query: string, surahNumber?: number) {
  const params = new URLSearchParams({ q: query })
  if (surahNumber) {
    params.set('surahNumber', String(surahNumber))
  }

  return apiRequest<Array<Ayah | SurahSummary>>(`/references/quran/search?${params.toString()}`, undefined, false)
}

export async function toggleQuranBookmark(_userId: string, ayah: QuranBookmarkSource, existingNote = '') {
  return apiRequest<QuranBookmark | null>('/bookmarks/quran/toggle', {
    method: 'POST',
    body: JSON.stringify({
      surahNumber: ayah.surahNumber,
      ayahNumber: ayah.ayahNumber,
      surahName: ayah.surahNameLatin ?? ayah.surahName ?? '',
      arabicText: ayah.arabic ?? ayah.arabicText ?? '',
      translation: ayah.translation,
      note: existingNote,
    }),
  })
}

export async function updateQuranBookmarkNote(bookmarkId: string, note: string) {
  return apiRequest<QuranBookmark>(`/bookmarks/quran/${bookmarkId}`, {
    method: 'PATCH',
    body: JSON.stringify({ note }),
  })
}

export async function getQuranBookmarks(_userId: string) {
  return apiRequest<QuranBookmark[]>('/bookmarks/quran')
}
