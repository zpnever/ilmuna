import surahSummaries from '@/data/generated/quran-surahs.json'
import { readDatabase, updateDatabase } from '@/lib/storage'
import { delay, makeId } from '@/lib/utils'
import type { Ayah, QuranBookmark, SurahDetail, SurahSummary } from '@/types/domain'

interface RawSurahFile {
  [key: string]: {
    name: string
    name_latin: string
    number_of_ayah: string
    text: Record<string, string>
    translations: {
      id: {
        name: string
        text: Record<string, string>
      }
    }
  }
}

export async function getSurahList() {
  return delay(surahSummaries as SurahSummary[], 200)
}

export async function getSurahDetail(surahNumber: number): Promise<SurahDetail> {
  const response = await fetch(`/data/quran/${surahNumber}.json`)
  const data = (await response.json()) as RawSurahFile
  const key = String(surahNumber)
  const surah = data[key]

  const ayahs: Ayah[] = Object.keys(surah.text).map((ayahNumber) => ({
    surahNumber,
    surahName: surah.name,
    surahNameLatin: surah.name_latin,
    ayahNumber: Number(ayahNumber),
    arabic: surah.text[ayahNumber],
    translation: surah.translations.id.text[ayahNumber],
  }))

  return {
    number: surahNumber,
    name: surah.name,
    nameLatin: surah.name_latin,
    ayahCount: Number(surah.number_of_ayah),
    translationName: surah.translations.id.name,
    ayahs,
  }
}

export async function searchAyah(query: string, surahNumber?: number) {
  const term = query.trim().toLowerCase()

  if (!surahNumber) {
    const summaries = (surahSummaries as SurahSummary[])
      .filter(
        (entry) =>
          entry.nameLatin.toLowerCase().includes(term) ||
          entry.translationName.toLowerCase().includes(term) ||
          String(entry.number) === term,
      )
      .slice(0, 8)

    return delay(summaries, 100)
  }

  const surah = await getSurahDetail(surahNumber)
  const ayahs = surah.ayahs
    .filter(
      (entry) =>
        entry.translation.toLowerCase().includes(term) || String(entry.ayahNumber).includes(term),
    )
    .slice(0, 10)

  return delay(ayahs, 100)
}

export async function toggleQuranBookmark(
  userId: string,
  ayah: Ayah,
  existingNote = '',
) {
  const database = readDatabase()
  const existing = database.quranBookmarks.find(
    (entry) =>
      entry.userId === userId &&
      entry.surahNumber === ayah.surahNumber &&
      entry.ayahNumber === ayah.ayahNumber,
  )

  if (existing) {
    updateDatabase((draft) => ({
      ...draft,
      quranBookmarks: draft.quranBookmarks.filter((entry) => entry.id !== existing.id),
    }))
    return delay(null, 80)
  }

  const bookmark: QuranBookmark = {
    id: makeId('quran-bookmark'),
    userId,
    surahNumber: ayah.surahNumber,
    ayahNumber: ayah.ayahNumber,
    surahName: ayah.surahNameLatin,
    arabicText: ayah.arabic,
    translation: ayah.translation,
    note: existingNote,
    createdAt: new Date().toISOString(),
  }

  updateDatabase((draft) => ({
    ...draft,
    quranBookmarks: [bookmark, ...draft.quranBookmarks],
  }))

  return delay(bookmark, 80)
}

export async function updateQuranBookmarkNote(bookmarkId: string, note: string) {
  updateDatabase((draft) => ({
    ...draft,
    quranBookmarks: draft.quranBookmarks.map((entry) =>
      entry.id === bookmarkId
        ? {
            ...entry,
            note,
          }
        : entry,
    ),
  }))
  return delay(true, 80)
}

export async function getQuranBookmarks(userId: string) {
  const bookmarks = readDatabase()
    .quranBookmarks.filter((entry) => entry.userId === userId)
    .sort((left, right) => +new Date(right.createdAt) - +new Date(left.createdAt))

  return delay(bookmarks, 120)
}
