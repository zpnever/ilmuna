import { readDatabase, updateDatabase } from '@/lib/storage'
import { delay, makeId } from '@/lib/utils'
import type { HadithBook, HadithBookmark, HadithEntry } from '@/types/domain'

interface RawHadithEntry {
  number: number
  arab: string
  id: string
}

const BOOK_NAME_OVERRIDES: Record<string, string> = {
  'abu-dawud': 'Abu Dawud',
  ahmad: 'Musnad Ahmad',
  bukhari: 'Bukhari',
  darimi: 'Darimi',
  'ibnu-majah': 'Ibnu Majah',
  malik: 'Muwatha Malik',
  muslim: 'Muslim',
  nasai: "Nasa'i",
  tirmidzi: 'Tirmidzi',
}

export async function getHadithBooks() {
  const response = await fetch('/data/hadist/list.json')
  const books = (await response.json()) as HadithBook[]
  return books
}

export async function getHadithEntries(bookSlug: string, limit = 40) {
  const response = await fetch(`/data/hadist/${bookSlug}.json`)
  const entries = (await response.json()) as RawHadithEntry[]
  const bookName = BOOK_NAME_OVERRIDES[bookSlug] ?? bookSlug

  const mapped: HadithEntry[] = entries.slice(0, limit).map((entry) => ({
    bookSlug,
    bookName,
    number: entry.number,
    arabic: entry.arab,
    translation: entry.id,
  }))

  return delay(mapped, 260)
}

export async function toggleHadithBookmark(
  userId: string,
  hadith: HadithEntry,
  existingNote = '',
) {
  const database = readDatabase()
  const existing = database.hadithBookmarks.find(
    (entry) =>
      entry.userId === userId &&
      entry.bookSlug === hadith.bookSlug &&
      entry.hadithNumber === hadith.number,
  )

  if (existing) {
    updateDatabase((draft) => ({
      ...draft,
      hadithBookmarks: draft.hadithBookmarks.filter((entry) => entry.id !== existing.id),
    }))

    return delay(null, 80)
  }

  const bookmark: HadithBookmark = {
    id: makeId('hadith-bookmark'),
    userId,
    bookSlug: hadith.bookSlug,
    bookName: hadith.bookName,
    hadithNumber: hadith.number,
    arabicText: hadith.arabic,
    translation: hadith.translation,
    note: existingNote,
    createdAt: new Date().toISOString(),
  }

  updateDatabase((draft) => ({
    ...draft,
    hadithBookmarks: [bookmark, ...draft.hadithBookmarks],
  }))

  return delay(bookmark, 80)
}

export async function updateHadithBookmarkNote(bookmarkId: string, note: string) {
  updateDatabase((draft) => ({
    ...draft,
    hadithBookmarks: draft.hadithBookmarks.map((entry) =>
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

export async function getHadithBookmarks(userId: string) {
  const bookmarks = readDatabase()
    .hadithBookmarks.filter((entry) => entry.userId === userId)
    .sort((left, right) => +new Date(right.createdAt) - +new Date(left.createdAt))

  return delay(bookmarks, 120)
}
