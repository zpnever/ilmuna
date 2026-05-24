export type UserRole = 'member' | 'ustadz' | 'admin'

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

export interface RichTextBlock {
  type: 'richText'
  html: string
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

export type PostContentBlock = RichTextBlock | QuranQuoteBlock | ImageBlock

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
}

export interface GroupMaterial {
  id: string
  title: string
  description: string
  type: 'pdf' | 'link' | 'text'
  resourceUrl?: string
  createdAt: string
}

export interface GroupDiscussionPost {
  id: string
  authorId: string
  content: string
  createdAt: string
}

export interface GroupMember {
  id: string
  groupId: string
  userId: string
  groupRole: 'ustadz' | 'moderator' | 'student'
  joinedAt: string
}

export interface Task {
  id: string
  groupId: string
  title: string
  description: string
  type: 'hafalan' | 'catatan' | 'bacaan' | 'lainnya'
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
  isPublic: boolean
  inviteCode: string
  coverUrl: string
  tags: string[]
  createdAt: string
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

export interface NotificationItem {
  id: string
  userId: string
  actorId: string
  type:
    | 'follow'
    | 'post_like'
    | 'post_comment'
    | 'comment_reply'
    | 'new_task'
    | 'new_material'
    | 'task_review'
  message: string
  isRead: boolean
  createdAt: string
}

export interface ModerationItem {
  postId: string
  status: 'visible' | 'hidden'
  reason: string
  updatedAt: string
}

export interface AdminStats {
  usersCount: number
  groupsCount: number
  postsCount: number
  commentsCount: number
  pendingSubmissionsCount: number
  unreadNotificationsCount: number
}

export interface DemoDatabase {
  users: User[]
  follows: FollowRelation[]
  posts: Post[]
  comments: CommentThread[]
  groups: Group[]
  groupMembers: GroupMember[]
  submissions: TaskSubmission[]
  quranBookmarks: QuranBookmark[]
  hadithBookmarks: HadithBookmark[]
  notifications: NotificationItem[]
  moderation: ModerationItem[]
}
