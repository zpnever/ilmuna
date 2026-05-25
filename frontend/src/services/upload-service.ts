import { apiRequest } from '@/lib/api'
import type { MediaUpload, MediaUploadBatch } from '@/types/domain'

async function uploadSingle(path: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)

  return apiRequest<MediaUpload>(
    path,
    {
      method: 'POST',
      body: formData,
    },
  )
}

export function uploadAvatar(file: File) {
  return uploadSingle('/uploads/avatar', file)
}

export function uploadCover(file: File) {
  return uploadSingle('/uploads/cover', file)
}

export function uploadGroupCover(file: File) {
  return uploadSingle('/uploads/group-cover', file)
}

export async function uploadPostImages(files: File[]) {
  const formData = new FormData()
  for (const file of files.slice(0, 4)) {
    formData.append('files', file)
  }

  const payload = await apiRequest<MediaUploadBatch>('/uploads/post-images', {
    method: 'POST',
    body: formData,
  })

  return payload.files
}

export function uploadMaterialFile(file: File) {
  return uploadSingle('/uploads/material', file)
}
