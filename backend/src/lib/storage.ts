import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { HttpError } from './http-error.js'

const storageRoot = path.resolve(process.cwd(), 'storage')

const storageFolders = {
  avatars: 'avatars',
  covers: 'covers',
  posts: 'posts',
  groups: 'groups',
  materials: 'materials',
} as const

export type StorageFolder = keyof typeof storageFolders

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

function sanitizeBaseName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'file'
}

function getExtension(originalName: string, mimeType: string) {
  const direct = path.extname(originalName)
  if (direct) {
    return direct.toLowerCase()
  }

  if (mimeType === 'image/jpeg') return '.jpg'
  if (mimeType === 'image/png') return '.png'
  if (mimeType === 'image/webp') return '.webp'
  if (mimeType === 'image/gif') return '.gif'
  if (mimeType === 'application/pdf') return '.pdf'
  if (mimeType === 'text/plain') return '.txt'
  if (mimeType === 'application/msword') return '.doc'
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return '.docx'
  }

  return ''
}

export async function ensureStorageDirectories() {
  await mkdir(storageRoot, { recursive: true })
  await Promise.all(
    Object.values(storageFolders).map((folder) =>
      mkdir(path.join(storageRoot, folder), { recursive: true }),
    ),
  )
}

export async function saveBufferToStorage(
  folder: StorageFolder,
  file: {
    buffer: Buffer
    originalname: string
    mimetype: string
  },
) {
  if (!allowedMimeTypes.has(file.mimetype)) {
    throw new HttpError(400, 'Tipe file tidak didukung.')
  }

  const extension = getExtension(file.originalname, file.mimetype)
  const baseName = sanitizeBaseName(path.basename(file.originalname, extension))
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${baseName}${extension}`
  const targetDir = path.join(storageRoot, storageFolders[folder])
  const absolutePath = path.join(targetDir, filename)

  await mkdir(targetDir, { recursive: true })
  await writeFile(absolutePath, file.buffer)

  return {
    url: `/storage/${storageFolders[folder]}/${filename}`,
    fileName: filename,
    mimeType: file.mimetype,
  }
}

export function getStorageRoot() {
  return storageRoot
}
