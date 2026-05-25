import { apiRequest } from '@/lib/api'
import type {
  GroupCommentThread,
  Group,
  GroupDiscussionPost,
  GroupJoinRequest,
  GroupMaterial,
  GroupMember,
  PostContentBlock,
  Task,
  TaskSubmission,
} from '@/types/domain'

interface GroupDetailPayload {
  group: Group
  members: GroupMember[]
  forumPosts: GroupDiscussionPost[]
}

interface GroupTaskDetailPayload {
  group: Group
  task: Task
  submissions: TaskSubmission[]
}

interface CreateGroupInput {
  name: string
  slug: string
  description: string
  visibility: 'public' | 'private'
  coverUrl: string
  tags: string[]
}

interface CreateGroupPostInput {
  blocks: PostContentBlock[]
  images: string[]
}

function normalizeGroupPost(post: GroupDiscussionPost): GroupDiscussionPost {
  return {
    ...post,
    content: (post.content ?? []) as PostContentBlock[],
    images: post.images ?? [],
    likeUserIds: post.likeUserIds ?? [],
    dislikeUserIds: post.dislikeUserIds ?? [],
    shareCount: post.shareCount ?? 0,
    commentCount: post.commentCount ?? 0,
    engagementScore: post.engagementScore ?? 0,
  }
}

export async function getGroups() {
  const groups = await apiRequest<Group[]>('/groups')
  return groups.map((group) => ({
    ...group,
    forumPosts: group.forumPosts ?? [],
    materials: group.materials ?? [],
    tasks: group.tasks ?? [],
  }))
}

export async function getGroupDetail(slug: string) {
  const payload = await apiRequest<GroupDetailPayload>(`/groups/${slug}`)
  return {
    group: {
      ...payload.group,
      forumPosts: payload.forumPosts.map(normalizeGroupPost),
      materials: [],
      tasks: [],
    },
    members: payload.members,
  }
}

export async function requestJoinGroup(slug: string) {
  return apiRequest<{ status: string; membershipId?: string }>(`/groups/${slug}/join-requests`, {
    method: 'POST',
  })
}

export async function createGroup(input: CreateGroupInput) {
  return apiRequest<Group>('/groups', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateGroup(
  slug: string,
  input: Partial<CreateGroupInput>,
) {
  return apiRequest<Group>(`/groups/${slug}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function reviewJoinRequest(
  slug: string,
  requestId: string,
  status: 'approved' | 'rejected',
  note = '',
) {
  return apiRequest<{ status: string }>(`/groups/${slug}/join-requests/${requestId}/review`, {
    method: 'POST',
    body: JSON.stringify({ status, note }),
  })
}

export async function getGroupJoinRequests(slug: string) {
  return apiRequest<GroupJoinRequest[]>(`/groups/${slug}/join-requests`)
}

export async function updateGroupMemberRole(
  slug: string,
  memberId: string,
  role: 'moderator' | 'admin' | 'ustadz' | 'anggota',
) {
  return apiRequest<GroupMember>(`/groups/${slug}/members/${memberId}/role`, {
    method: 'POST',
    body: JSON.stringify({ role }),
  })
}

export async function leaveGroup(slug: string) {
  return apiRequest<{ ok: true }>(`/groups/${slug}/leave`, {
    method: 'POST',
  })
}

export async function kickGroupMember(slug: string, memberId: string) {
  return apiRequest<{ ok: true }>(`/groups/${slug}/members/${memberId}/kick`, {
    method: 'POST',
  })
}

export async function getGroupPosts(slug: string) {
  const posts = await apiRequest<GroupDiscussionPost[]>(`/groups/${slug}/posts`)
  return posts.map(normalizeGroupPost)
}

export async function createGroupPost(slug: string, input: CreateGroupPostInput) {
  const post = await apiRequest<GroupDiscussionPost>(`/groups/${slug}/posts`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return normalizeGroupPost(post)
}

export async function getGroupPostComments(slug: string, postId: string) {
  return apiRequest<GroupCommentThread[]>(`/groups/${slug}/posts/${postId}/comments`)
}

export async function addGroupPostComment(
  slug: string,
  postId: string,
  content: string,
  parentId: string | null,
) {
  return apiRequest<GroupCommentThread>(`/groups/${slug}/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content, parentId }),
  })
}

export async function toggleGroupPostReaction(
  slug: string,
  postId: string,
  type: 'like' | 'dislike',
) {
  return apiRequest<{ ok: true }>(`/groups/${slug}/posts/${postId}/reactions`, {
    method: 'POST',
    body: JSON.stringify({ type }),
  })
}

export async function getGroupMembers(slug: string) {
  return apiRequest<GroupMember[]>(`/groups/${slug}/members`)
}

export async function createGroupMaterial(
  slug: string,
  input: Pick<GroupMaterial, 'title' | 'description' | 'type' | 'resourceUrl' | 'fileUrl' | 'fileName' | 'mimeType'>,
) {
  return apiRequest<GroupMaterial>(`/groups/${slug}/materials`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function getGroupMaterials(slug: string) {
  return apiRequest<GroupMaterial[]>(`/groups/${slug}/materials`)
}

export async function getGroupTasks(slug: string) {
  return apiRequest<Task[]>(`/groups/${slug}/tasks`)
}

export async function getGroupTaskDetail(slug: string, taskId: string) {
  return apiRequest<GroupTaskDetailPayload>(`/groups/${slug}/tasks/${taskId}`)
}

export async function createSubmission(taskId: string, _userId: string, content: string, slug: string) {
  return apiRequest<TaskSubmission>(`/groups/${slug}/tasks/${taskId}/submissions`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}

export async function reviewSubmission(
  submissionId: string,
  status: 'accepted' | 'revision',
  note: string,
) {
  return apiRequest<TaskSubmission>(`/groups/submissions/${submissionId}/review`, {
    method: 'POST',
    body: JSON.stringify({ status, note }),
  })
}

export async function getFeaturedGroup() {
  const groups = await getGroups()
  return groups[0] ?? null
}
