export type UserRole = 'member' | 'ustadz' | 'admin'
export type ThemePreference = 'light' | 'dark'

export interface User {
  id: string
  username: string
  name: string
  email: string
  role: UserRole
  bio: string
  location: string
  website: string
  avatarUrl: string
  coverUrl: string
  interests: string[]
  isPrivate: boolean
  themePreference: ThemePreference
  notificationPreferences: {
    email: boolean
    push: boolean
    group: boolean
  }
  emailVerified: boolean
  isVerified: boolean
  joinedAt: string
}

export interface SessionUser extends User {
  activeRole: UserRole
}

export interface Profile extends User {
  followersCount: number
  followingCount: number
  postsCount: number
  isFollowedByViewer: boolean
}

export interface FollowRelation {
  id: string
  followerId: string
  followingId: string
  createdAt: string
}

export interface MarkdownBlock {
  type: 'markdown'
  markdown: string
}

export interface QuranQuoteBlock {
  type: 'quranQuote'
  surahNumber: number
  ayahNumber: number
  surahName: string
  surahNameLatin: string
  arabic: string
  translation: string
}

export interface ImageBlock {
  type: 'images'
  images: string[]
}

export type PostContentBlock = MarkdownBlock | QuranQuoteBlock | ImageBlock

export interface Post {
  id: string
  authorId: string
  content: PostContentBlock[]
  images: string[]
  visibility: 'public'
  tags: string[]
  createdAt: string
  likeUserIds: string[]
  dislikeUserIds: string[]
  shareCount: number
}

export interface CommentThread {
  id: string
  postId: string
  authorId: string
  parentId: string | null
  content: string
  createdAt: string
  authorName?: string
  authorUsername?: string
  authorAvatar?: string
}

export type GroupRole = 'moderator' | 'admin' | 'ustadz' | 'anggota'
export type GroupVisibility = 'public' | 'private'
export type MembershipStatus = 'member' | 'non-member'
export type JoinRequestStatus = 'pending' | 'approved' | 'rejected' | null

export interface GroupJoinRequest {
  id: string
  groupId: string
  userId: string
  status: 'pending' | 'approved' | 'rejected'
  requestedAt: string
  reviewedAt: string | null
  note: string
  user: User
}

export interface GroupMaterial {
  id: string
  groupId?: string
  uploaderId?: string
  title: string
  description: string
  type: 'pdf' | 'link' | 'text' | string
  resourceUrl?: string | null
  fileUrl?: string | null
  fileName?: string | null
  mimeType?: string | null
  createdAt: string
}

export interface GroupDiscussionPost {
  id: string
  groupId: string
  authorId: string
  authorName: string
  authorUsername: string
  authorAvatar: string
  content: PostContentBlock[]
  images: string[]
  createdAt: string
  likeUserIds: string[]
  dislikeUserIds: string[]
  shareCount: number
  commentCount: number
  engagementScore: number
}

export interface GroupCommentThread {
  id: string
  groupPostId: string
  authorId: string
  parentId: string | null
  content: string
  createdAt: string
  authorName?: string
  authorUsername?: string
  authorAvatar?: string
}

export interface GroupMember {
  id: string
  groupId: string
  userId: string
  groupRole: GroupRole
  joinedAt: string
  user?: User
}

export interface Task {
  id: string
  groupId: string
  title: string
  description: string
  type: 'hafalan' | 'catatan' | 'bacaan' | 'lainnya' | string
  surahRef: string
  dueDate: string
  createdAt: string
}

export interface TaskSubmission {
  id: string
  taskId: string
  userId: string
  content: string
  status: 'pending' | 'accepted' | 'revision'
  note: string
  submittedAt: string
}

export interface Group {
  id: string
  name: string
  slug: string
  description: string
  visibility: GroupVisibility
  isPublic: boolean
  membershipStatus: MembershipStatus
  joinRequestStatus: JoinRequestStatus
  inviteCode: string
  coverUrl: string
  tags: string[]
  createdAt: string
  viewerRole?: GroupRole | null
  forumPosts: GroupDiscussionPost[]
  materials: GroupMaterial[]
  tasks: Task[]
}

export interface SurahSummary {
  number: number
  name: string
  nameLatin: string
  ayahCount: number
  translationName: string
}

export interface Ayah {
  surahNumber: number
  surahName: string
  surahNameLatin: string
  ayahNumber: number
  arabic: string
  translation: string
}

export interface SurahDetail extends SurahSummary {
  ayahs: Ayah[]
}

export interface QuranBookmark {
  id: string
  userId: string
  surahNumber: number
  ayahNumber: number
  surahName: string
  arabicText: string
  translation: string
  note: string
  createdAt: string
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

export interface HadithPage {
  bookSlug: string
  bookName: string
  total: number
  limit: number
  offset: number
  hasMore: boolean
  items: HadithEntry[]
}

export interface HadithBookmark {
  id: string
  userId: string
  bookSlug: string
  bookName: string
  hadithNumber: number
  arabicText: string
  translation: string
  note: string
  createdAt: string
}

export interface ReferenceBookmarks {
  quran: QuranBookmark[]
  hadith: HadithBookmark[]
}

export interface MediaUpload {
  url: string
  fileName: string
  mimeType: string
}

export interface MediaUploadBatch {
  files: MediaUpload[]
}

export interface NotificationItem {
  id: string
  userId: string
  actorId: string | null
  type:
    | 'follow'
    | 'post_like'
    | 'post_comment'
    | 'comment_reply'
    | 'new_task'
    | 'new_material'
    | 'task_review'
    | 'join_request'
    | 'post_report'
  message: string
  isRead: boolean
  createdAt: string
  actorName?: string | null
}

export interface AdminStats {
  usersCount: number
  groupsCount: number
  postsCount: number
  commentsCount: number
  pendingSubmissionsCount: number
  unreadNotificationsCount: number
}

export interface AdminUser extends User {
  isBanned: boolean
  deletedAt: string | null
}

export interface AdminGroup extends Group {
  membersCount: number
}

export interface AdminReportItem {
  id: string
  reason: string
  status: 'pending' | 'taken_down' | 'dismissed'
  moderatorNote: string
  createdAt: string
  reporter: User
  post: Post & {
    authorName: string
    authorUsername: string
    authorAvatar: string
    commentCount: number
    engagementScore: number
    isHidden: boolean
    reportCount: number
  }
}
