import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'
import { PrismaClient, UserRole } from '@prisma/client'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL belum diatur untuk proses seed.')
}

const adapter = new PrismaPg({
  connectionString: databaseUrl,
})

const prisma = new PrismaClient({
  adapter,
})

async function main() {
  await prisma.notification.deleteMany()
  await prisma.hadithBookmark.deleteMany()
  await prisma.quranBookmark.deleteMany()
  await prisma.groupTaskSubmission.deleteMany()
  await prisma.groupTask.deleteMany()
  await prisma.groupMaterial.deleteMany()
  await prisma.groupPostComment.deleteMany()
  await prisma.groupPostReaction.deleteMany()
  await prisma.groupPost.deleteMany()
  await prisma.groupJoinRequest.deleteMany()
  await prisma.groupMember.deleteMany()
  await prisma.group.deleteMany()
  await prisma.postReport.deleteMany()
  await prisma.postReaction.deleteMany()
  await prisma.postComment.deleteMany()
  await prisma.post.deleteMany()
  await prisma.follow.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.user.deleteMany()

  const passwordHash = await bcrypt.hash('10203040', 10)

  await prisma.user.create({
    data: {
      username: 'ilmuna',
      name: 'Ilmuna Admin',
      email: 'ilmuna@gmail.com',
      passwordHash,
      role: UserRole.ADMIN,
      bio: '',
      location: '',
      website: '',
      avatarUrl: '/avatars/suko.png',
      coverUrl: '',
      interests: [],
      isPrivate: false,
      notificationPreferences: {
        email: true,
        push: true,
        group: true,
      },
      emailVerified: true,
      isVerified: true,
    },
  })
}

main()
  .then(async () => {
    console.log('Seed database Ilmuna selesai.')
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
