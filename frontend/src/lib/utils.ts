import { clsx, type ClassValue } from 'clsx'
import { formatDistanceToNowStrict } from 'date-fns'
import { id } from 'date-fns/locale'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function relativeTime(date: string) {
  return `${formatDistanceToNowStrict(new Date(date), {
    addSuffix: true,
    locale: id,
  })}`
}

export function formatLongDate(date: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

export function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function seededShuffle<T>(items: T[], seed = 13) {
  const cloned = [...items]
  let currentSeed = seed

  for (let index = cloned.length - 1; index > 0; index -= 1) {
    currentSeed = (currentSeed * 9301 + 49297) % 233280
    const swapIndex = Math.floor((currentSeed / 233280) * (index + 1))
    ;[cloned[index], cloned[swapIndex]] = [cloned[swapIndex], cloned[index]]
  }

  return cloned
}

export function delay<T>(value: T, timeout = 250) {
  return new Promise<T>((resolve) => {
    window.setTimeout(() => resolve(value), timeout)
  })
}

export function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}

export function isBrowser() {
  return typeof window !== 'undefined'
}
