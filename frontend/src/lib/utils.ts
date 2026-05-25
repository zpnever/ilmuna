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

export function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function renderInlineMarkdown(value: string) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
}

export function markdownToHtml(markdown: string) {
  const lines = markdown.replace(/\r/g, '').split('\n')
  const parts: string[] = []
  let listItems: string[] = []

  function flushList() {
    if (!listItems.length) {
      return
    }
    parts.push(`<ul>${listItems.join('')}</ul>`)
    listItems = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) {
      flushList()
      continue
    }

    if (/^[-*]\s+/.test(line)) {
      listItems.push(`<li>${renderInlineMarkdown(line.replace(/^[-*]\s+/, ''))}</li>`)
      continue
    }

    flushList()

    if (/^###\s+/.test(line)) {
      parts.push(`<h3>${renderInlineMarkdown(line.replace(/^###\s+/, ''))}</h3>`)
      continue
    }

    if (/^##\s+/.test(line)) {
      parts.push(`<h2>${renderInlineMarkdown(line.replace(/^##\s+/, ''))}</h2>`)
      continue
    }

    if (/^#\s+/.test(line)) {
      parts.push(`<h1>${renderInlineMarkdown(line.replace(/^#\s+/, ''))}</h1>`)
      continue
    }

    if (/^>\s+/.test(line)) {
      parts.push(`<blockquote>${renderInlineMarkdown(line.replace(/^>\s+/, ''))}</blockquote>`)
      continue
    }

    parts.push(`<p>${renderInlineMarkdown(line)}</p>`)
  }

  flushList()

  return parts.join('')
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
