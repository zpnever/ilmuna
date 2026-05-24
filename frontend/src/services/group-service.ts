import { delay } from '@/lib/utils'
import { readDatabase, updateDatabase } from '@/lib/storage'
import type { Group, TaskSubmission } from '@/types/domain'

export async function getGroups() {
  const database = readDatabase()
  return delay(database.groups, 240)
}

export async function getGroupDetail(slug: string) {
  const database = readDatabase()
  const group = database.groups.find((entry) => entry.slug === slug)
  if (!group) {
    throw new Error('Grup tidak ditemukan.')
  }

  const members = database.groupMembers.filter((entry) => entry.groupId === group.id)

  return delay(
    {
      group,
      members,
    },
    240,
  )
}

export async function getGroupMaterials(slug: string) {
  const { group } = await getGroupDetail(slug)
  return delay(group.materials, 140)
}

export async function getGroupTasks(slug: string) {
  const { group } = await getGroupDetail(slug)
  return delay(group.tasks, 140)
}

export async function getGroupTaskDetail(slug: string, taskId: string) {
  const { group, members } = await getGroupDetail(slug)
  const task = group.tasks.find((entry) => entry.id === taskId)
  if (!task) {
    throw new Error('Tugas tidak ditemukan.')
  }

  const database = readDatabase()
  const submissions = database.submissions.filter((entry) => entry.taskId === task.id)

  return delay(
    {
      group,
      task,
      members,
      submissions,
    },
    140,
  )
}

export async function createSubmission(taskId: string, userId: string, content: string) {
  const submission: TaskSubmission = {
    id: crypto.randomUUID(),
    taskId,
    userId,
    content,
    status: 'pending',
    note: '',
    submittedAt: new Date().toISOString(),
  }

  updateDatabase((draft) => ({
    ...draft,
    submissions: [submission, ...draft.submissions.filter((entry) => !(entry.taskId === taskId && entry.userId === userId))],
  }))

  return delay(submission, 100)
}

export async function reviewSubmission(
  submissionId: string,
  status: 'accepted' | 'revision',
  note: string,
) {
  updateDatabase((draft) => ({
    ...draft,
    submissions: draft.submissions.map((entry) =>
      entry.id === submissionId
        ? {
            ...entry,
            status,
            note,
          }
        : entry,
    ),
  }))

  return delay(true, 100)
}

export function getFeaturedGroup(): Group | null {
  return readDatabase().groups[0] ?? null
}
