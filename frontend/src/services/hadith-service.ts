import { apiRequest } from '@/lib/api'
import type { HadithBook, HadithBookmark, HadithEntry, HadithPage } from '@/types/domain'

interface RawHadithPage {
  total: number
  nextOffset: number | null
  items: Array<{
    bookSlug: string
    bookName: string
    number: number
    arabic: string
    translation: string
  }>
}

function normalizePage(bookSlug: string, payload: RawHadithPage): HadithPage {
  const limit = payload.items.length
  const offset = payload.nextOffset == null ? Math.max(payload.total - limit, 0) : Math.max(payload.nextOffset - limit, 0)
  const bookName = payload.items[0]?.bookName ?? bookSlug

  return {
    bookSlug,
    bookName,
    total: payload.total,
    limit,
    offset,
    hasMore: payload.nextOffset !== null,
    items: payload.items.map<HadithEntry>((item) => ({
      bookSlug,
      bookName,
      number: item.number,
      arabic: item.arabic,
      translation: item.translation,
    })),
  }
}

export async function getHadithBooks() {
  return apiRequest<HadithBook[]>('/references/hadith/books', undefined, false)
}

export async function getHadithEntries(bookSlug: string, limit = 40, offset = 0) {
  return getHadithEntriesSearch(bookSlug, '', limit, offset)
}

export async function getHadithEntriesSearch(bookSlug: string, search = '', limit = 40, offset = 0) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })
  if (search.trim()) {
    params.set('q', search.trim())
  }

  const payload = await apiRequest<RawHadithPage>(
    `/references/hadith/books/${bookSlug}?${params.toString()}`,
    undefined,
    false,
  )
  return normalizePage(bookSlug, payload)
}

export async function toggleHadithBookmark(
  _userId: string,
  hadith: HadithEntry,
  existingNote = '',
) {
  return apiRequest<HadithBookmark | null>('/bookmarks/hadith/toggle', {
    method: 'POST',
    body: JSON.stringify({
      bookSlug: hadith.bookSlug,
      bookName: hadith.bookName,
      hadithNumber: hadith.number,
      arabicText: hadith.arabic,
      translation: hadith.translation,
      note: existingNote,
    }),
  })
}

export async function updateHadithBookmarkNote(bookmarkId: string, note: string) {
  return apiRequest<HadithBookmark>(`/bookmarks/hadith/${bookmarkId}`, {
    method: 'PATCH',
    body: JSON.stringify({ note }),
  })
}

export async function getHadithBookmarks(_userId: string) {
  return apiRequest<HadithBookmark[]>('/bookmarks/hadith')
}
