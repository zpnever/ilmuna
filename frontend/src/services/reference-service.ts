import { apiRequest } from '@/lib/api'
import type { ReferenceBookmarks } from '@/types/domain'

export function getReferenceBookmarks() {
  return apiRequest<ReferenceBookmarks>('/references/bookmarks')
}
