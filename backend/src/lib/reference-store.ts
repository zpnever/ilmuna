import { promises as fs } from 'node:fs'
import path from 'node:path'
import { LRUCache } from 'lru-cache'

export interface QuranAyah {
  surahNumber: number
  surahName: string
  surahNameLatin: string
  ayahNumber: number
  arabic: string
  translation: string
}

export interface QuranSurahSummary {
  number: number
  name: string
  nameLatin: string
  ayahCount: number
  translationName: string
}

export interface QuranSurahDetail extends QuranSurahSummary {
  ayahs: QuranAyah[]
}

export interface HadithBook {
  name: string
  slug: string
  total: number
}

export interface HadithEntry {
  bookSlug: string
  bookName: string
  number: number
  arabic: string
  translation: string
}

const rootDataDir = path.resolve(process.cwd(), 'data')
const quranDir = path.join(rootDataDir, 'quran')
const hadithDir = path.join(rootDataDir, 'hadist')

const referenceCache = new LRUCache<string, {}>({
  max: 256,
  ttl: 1000 * 60 * 60,
})

interface RawQuranFile {
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

interface RawHadithEntry {
  number: number
  arab: string
  id: string
}

export async function getQuranSurahList() {
  const cacheKey = 'quran:surah-list'
  const cached = referenceCache.get(cacheKey)
  if (cached) {
    return cached as QuranSurahSummary[]
  }

  const surahs: QuranSurahSummary[] = []
  for (let surahNumber = 1; surahNumber <= 114; surahNumber += 1) {
    const raw = await fs.readFile(path.join(quranDir, `${surahNumber}.json`), 'utf8')
    const data = JSON.parse(raw) as RawQuranFile
    const surah = data[String(surahNumber)]
    surahs.push({
      number: surahNumber,
      name: surah.name,
      nameLatin: surah.name_latin,
      ayahCount: Number(surah.number_of_ayah),
      translationName: surah.translations.id.name,
    })
  }

  referenceCache.set(cacheKey, surahs)
  return surahs
}

export async function getQuranSurahDetail(surahNumber: number) {
  const cacheKey = `quran:surah:${surahNumber}`
  const cached = referenceCache.get(cacheKey)
  if (cached) {
    return cached as QuranSurahDetail
  }

  const raw = await fs.readFile(path.join(quranDir, `${surahNumber}.json`), 'utf8')
  const data = JSON.parse(raw) as RawQuranFile
  const surah = data[String(surahNumber)]

  const detail: QuranSurahDetail = {
    number: surahNumber,
    name: surah.name,
    nameLatin: surah.name_latin,
    ayahCount: Number(surah.number_of_ayah),
    translationName: surah.translations.id.name,
    ayahs: Object.keys(surah.text).map((ayahNumber) => ({
      surahNumber,
      surahName: surah.name,
      surahNameLatin: surah.name_latin,
      ayahNumber: Number(ayahNumber),
      arabic: surah.text[ayahNumber],
      translation: surah.translations.id.text[ayahNumber],
    })),
  }

  referenceCache.set(cacheKey, detail)
  return detail
}

export async function getQuranAyah(surahNumber: number, ayahNumber: number) {
  const surah = await getQuranSurahDetail(surahNumber)
  return surah.ayahs.find((entry) => entry.ayahNumber === ayahNumber) ?? null
}

export async function searchQuran(term: string, surahNumber?: number) {
  const query = term.trim().toLowerCase()
  if (!surahNumber) {
    const surahs = await getQuranSurahList()
    return surahs
      .filter((entry) =>
        entry.nameLatin.toLowerCase().includes(query) ||
        entry.translationName.toLowerCase().includes(query) ||
        String(entry.number).includes(query),
      )
      .slice(0, 12)
  }

  const surah = await getQuranSurahDetail(surahNumber)
  return surah.ayahs
    .filter((entry) =>
      entry.translation.toLowerCase().includes(query) || String(entry.ayahNumber).includes(query),
    )
    .slice(0, 20)
}

export async function getHadithBooks() {
  const cacheKey = 'hadith:books'
  const cached = referenceCache.get(cacheKey)
  if (cached) {
    return cached as HadithBook[]
  }

  const raw = await fs.readFile(path.join(hadithDir, 'list.json'), 'utf8')
  const books = JSON.parse(raw) as HadithBook[]
  referenceCache.set(cacheKey, books)
  return books
}

export async function getHadithPage(bookSlug: string, limit: number, offset: number, query = '') {
  const normalizedQuery = query.trim().toLowerCase()
  const cacheKey = `hadith:${bookSlug}:${limit}:${offset}:${normalizedQuery}`
  const cached = referenceCache.get(cacheKey)
  if (cached) {
    return cached as { items: HadithEntry[]; total: number; nextOffset: number | null }
  }

  const books = await getHadithBooks()
  const book = books.find((entry) => entry.slug === bookSlug)
  if (!book) {
    return null
  }

  const raw = await fs.readFile(path.join(hadithDir, `${bookSlug}.json`), 'utf8')
  const hadiths = JSON.parse(raw) as RawHadithEntry[]
  const filtered = normalizedQuery
    ? hadiths.filter((entry) => {
        const number = String(entry.number)
        return (
          number.includes(normalizedQuery) ||
          entry.id.toLowerCase().includes(normalizedQuery) ||
          entry.arab.toLowerCase().includes(normalizedQuery)
        )
      })
    : hadiths
  const items = filtered.slice(offset, offset + limit).map((entry) => ({
    bookSlug,
    bookName: book.name,
    number: entry.number,
    arabic: entry.arab,
    translation: entry.id,
  }))

  const response = {
    items,
    total: filtered.length,
    nextOffset: offset + limit < filtered.length ? offset + limit : null,
  }

  referenceCache.set(cacheKey, response)
  return response
}
