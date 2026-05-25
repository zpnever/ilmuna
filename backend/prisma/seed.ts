import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'
import {
  GroupRole,
  GroupVisibility,
  NotificationType,
  PrismaClient,
  SubmissionStatus,
  UserRole,
} from '@prisma/client'

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

const password = '10203040'

function isoHoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000)
}

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

  const passwordHash = await bcrypt.hash(password, 10)

  const [demoUser, ustadzUser, naqiyyahUser, adminUser, hananUser] = await Promise.all([
    prisma.user.create({
      data: {
        username: 'ilmuna',
        name: 'Ilmuna User',
        email: 'ilmuna@gmail.com',
        passwordHash,
        role: UserRole.MEMBER,
        bio: 'Belajar rutin, senang tafsir tematik, dan menjaga kebiasaan murojaah harian.',
        location: 'Jakarta',
        website: 'https://ilmuna.id',
        avatarUrl: '/avatars/suko.png',
        coverUrl: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=1200&q=80',
        interests: ['tafsir', 'akhlak', 'komunitas', 'hadith'],
        emailVerified: true,
        isVerified: true,
        createdAt: isoHoursAgo(2400),
      },
    }),
    prisma.user.create({
      data: {
        username: 'ustadzfahmi',
        name: 'Ustadz Fahmi',
        email: 'fahmi@ilmuna.id',
        passwordHash,
        role: UserRole.USTADZ,
        bio: 'Mengajar tahsin, tafsir ringkas, dan kelas hafalan untuk keluarga muda.',
        location: 'Bandung',
        website: 'https://ilmuna.id/fahmi',
        avatarUrl: '/avatars/danush.jpeg',
        coverUrl: 'https://images.unsplash.com/photo-1496065187959-7f07b8353c55?auto=format&fit=crop&w=1200&q=80',
        interests: ['hafalan', 'tajwid', 'tafsir'],
        emailVerified: true,
        isVerified: true,
        createdAt: isoHoursAgo(3000),
      },
    }),
    prisma.user.create({
      data: {
        username: 'naqiyyah',
        name: 'Naqiyyah Putri',
        email: 'naqiyyah@ilmuna.id',
        passwordHash,
        role: UserRole.MEMBER,
        bio: 'Suka merangkum kajian dan berbagi catatan tadabbur yang ringan.',
        location: 'Yogyakarta',
        website: 'https://ilmuna.id/naqiyyah',
        avatarUrl: '/avatars/willdan.png',
        coverUrl: 'https://images.unsplash.com/photo-1491895200222-0fc4a4c35e18?auto=format&fit=crop&w=1200&q=80',
        interests: ['akhlak', 'sirah', 'keluarga'],
        emailVerified: true,
        isVerified: false,
        createdAt: isoHoursAgo(1800),
      },
    }),
    prisma.user.create({
      data: {
        username: 'admin',
        name: 'Admin Ilmuna',
        email: 'admin@ilmuna.id',
        passwordHash,
        role: UserRole.ADMIN,
        bio: 'Menjaga pengalaman belajar tetap aman, bersih, dan fokus.',
        location: 'Surabaya',
        website: 'https://ilmuna.id/admin',
        avatarUrl: '/avatars/suko.png',
        coverUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
        interests: ['moderasi', 'komunitas', 'produk'],
        emailVerified: true,
        isVerified: true,
        createdAt: isoHoursAgo(3600),
      },
    }),
    prisma.user.create({
      data: {
        username: 'hanan',
        name: 'Hanan Yusuf',
        email: 'hanan@ilmuna.id',
        passwordHash,
        role: UserRole.MEMBER,
        bio: 'Sedang fokus membangun komunitas belajar selepas subuh.',
        location: 'Makassar',
        website: 'https://ilmuna.id/hanan',
        avatarUrl: '/avatars/danush.jpeg',
        coverUrl: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=80',
        interests: ['komunitas', 'hafalan', 'sirah'],
        emailVerified: true,
        isVerified: false,
        createdAt: isoHoursAgo(1500),
      },
    }),
  ])

  await prisma.follow.createMany({
    data: [
      { followerId: demoUser.id, followingId: ustadzUser.id, createdAt: isoHoursAgo(200) },
      { followerId: demoUser.id, followingId: naqiyyahUser.id, createdAt: isoHoursAgo(150) },
      { followerId: naqiyyahUser.id, followingId: ustadzUser.id, createdAt: isoHoursAgo(130) },
      { followerId: hananUser.id, followingId: demoUser.id, createdAt: isoHoursAgo(120) },
    ],
  })

  const [post1, post2, post3, post4, post5, post6] = await Promise.all([
    prisma.post.create({
      data: {
        authorId: ustadzUser.id,
        blocks: [
          {
            type: 'markdown',
            markdown:
              'Mengulang pelajaran malam ini: target kecil yang konsisten sering lebih kuat daripada target besar yang cepat padam.',
          },
          {
            type: 'quranQuote',
            surahNumber: 94,
            ayahNumber: 5,
            surahName: 'الشرح',
            surahNameLatin: 'Ash-Sharh',
            arabic: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا',
            translation: 'Maka sesungguhnya beserta kesulitan ada kemudahan.',
          },
        ],
        tags: ['tafsir', 'akhlak'],
        createdAt: isoHoursAgo(4),
      },
    }),
    prisma.post.create({
      data: {
        authorId: naqiyyahUser.id,
        blocks: [
          {
            type: 'markdown',
            markdown:
              'Catatan kajian hari ini: adab menuntut ilmu bukan hanya duduk tenang, tapi juga menjaga niat saat ilmu mulai terasa berhasil.',
          },
          {
            type: 'images',
            images: ['https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80'],
          },
        ],
        images: ['https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80'],
        tags: ['akhlak', 'komunitas'],
        createdAt: isoHoursAgo(12),
      },
    }),
    prisma.post.create({
      data: {
        authorId: hananUser.id,
        blocks: [
          {
            type: 'markdown',
            markdown:
              'Lagi eksperimen format halaqah subuh 20 menit. Ternyata yang singkat justru bikin jamaah lebih rutin hadir.',
          },
        ],
        tags: ['komunitas', 'sirah'],
        createdAt: isoHoursAgo(7),
      },
    }),
    prisma.post.create({
      data: {
        authorId: demoUser.id,
        blocks: [
          {
            type: 'markdown',
            markdown:
              'Baru selesai baca ulang Al-Fatihah dengan tafsir ringkas. Ayat yang sudah hafal bertahun-tahun tetap bisa membuka sudut pandang baru.',
          },
        ],
        tags: ['tafsir', 'hadith'],
        createdAt: isoHoursAgo(30),
      },
    }),
    prisma.post.create({
      data: {
        authorId: ustadzUser.id,
        blocks: [
          {
            type: 'markdown',
            markdown:
              'Untuk santri grup tahfizh, pekan ini cukup setor 5 ayat dulu tapi benar makhrajnya. Kualitas lebih penting dari tergesa-gesa.',
          },
        ],
        tags: ['hafalan', 'tajwid'],
        createdAt: isoHoursAgo(21),
      },
    }),
    prisma.post.create({
      data: {
        authorId: naqiyyahUser.id,
        blocks: [
          {
            type: 'markdown',
            markdown:
              'Checklist kecil buat akhir pekan: satu halaman Qur’an, satu hadith, dan satu tindakan baik yang tidak diumumkan ke siapa-siapa.',
          },
          {
            type: 'quranQuote',
            surahNumber: 103,
            ayahNumber: 3,
            surahName: 'العصر',
            surahNameLatin: 'Al-Asr',
            arabic: 'إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ',
            translation: 'Kecuali orang-orang yang beriman dan mengerjakan kebajikan.',
          },
        ],
        tags: ['akhlak', 'quran'],
        createdAt: isoHoursAgo(2),
      },
    }),
  ])

  await prisma.postReaction.createMany({
    data: [
      { postId: post1.id, userId: demoUser.id, type: 'LIKE' },
      { postId: post1.id, userId: naqiyyahUser.id, type: 'LIKE' },
      { postId: post1.id, userId: hananUser.id, type: 'LIKE' },
      { postId: post2.id, userId: demoUser.id, type: 'LIKE' },
      { postId: post2.id, userId: ustadzUser.id, type: 'LIKE' },
      { postId: post3.id, userId: ustadzUser.id, type: 'LIKE' },
      { postId: post4.id, userId: naqiyyahUser.id, type: 'LIKE' },
      { postId: post5.id, userId: demoUser.id, type: 'LIKE' },
      { postId: post5.id, userId: naqiyyahUser.id, type: 'LIKE' },
      { postId: post5.id, userId: hananUser.id, type: 'LIKE' },
      { postId: post5.id, userId: adminUser.id, type: 'LIKE' },
      { postId: post6.id, userId: demoUser.id, type: 'LIKE' },
      { postId: post6.id, userId: ustadzUser.id, type: 'LIKE' },
      { postId: post6.id, userId: hananUser.id, type: 'LIKE' },
    ],
  })

  await prisma.post.update({ where: { id: post1.id }, data: { shareCount: 5 } })
  await prisma.post.update({ where: { id: post2.id }, data: { shareCount: 3 } })
  await prisma.post.update({ where: { id: post3.id }, data: { shareCount: 1 } })
  await prisma.post.update({ where: { id: post5.id }, data: { shareCount: 7 } })
  await prisma.post.update({ where: { id: post6.id }, data: { shareCount: 6 } })

  const comment1 = await prisma.postComment.create({
    data: {
      postId: post1.id,
      authorId: demoUser.id,
      content: 'Bagian target kecil ini kena sekali. Selama ini saya sering keburu muluk.',
      createdAt: isoHoursAgo(3),
    },
  })

  await prisma.postComment.createMany({
    data: [
      {
        postId: post1.id,
        authorId: ustadzUser.id,
        parentId: comment1.id,
        content: 'Pelan tapi rutin biasanya lebih tahan lama. Semoga dimudahkan.',
        createdAt: isoHoursAgo(2),
      },
      {
        postId: post2.id,
        authorId: hananUser.id,
        content: 'Catatannya rapi sekali. Boleh saya pakai untuk sesi remaja pekan ini?',
        createdAt: isoHoursAgo(9),
      },
    ],
  })

  const publicGroup = await prisma.group.create({
    data: {
      name: 'Halaqah Subuh Al-Bayan',
      slug: 'halaqah-subuh-al-bayan',
      description: 'Komunitas belajar Qur’an selepas subuh dengan fokus tadabbur, hafalan ringan, dan diskusi praktik.',
      visibility: GroupVisibility.PUBLIC,
      inviteCode: 'ALBAYAN24',
      coverUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1200&q=80',
      tags: ['hafalan', 'komunitas', 'subuh'],
      createdAt: isoHoursAgo(600),
    },
  })

  const privateGroup = await prisma.group.create({
    data: {
      name: 'Sirah Family Circle',
      slug: 'sirah-family-circle',
      description: 'Grup private untuk keluarga muda yang ingin belajar sirah nabawiyah secara bertahap dan membumi.',
      visibility: GroupVisibility.PRIVATE,
      inviteCode: 'SIRAHFAM',
      coverUrl: 'https://images.unsplash.com/photo-1475776408506-9a5371e7a068?auto=format&fit=crop&w=1200&q=80',
      tags: ['sirah', 'keluarga'],
      createdAt: isoHoursAgo(400),
    },
  })

  await prisma.groupMember.createMany({
    data: [
      { groupId: publicGroup.id, userId: ustadzUser.id, groupRole: GroupRole.MODERATOR, joinedAt: isoHoursAgo(550) },
      { groupId: publicGroup.id, userId: demoUser.id, groupRole: GroupRole.ANGGOTA, joinedAt: isoHoursAgo(200) },
      { groupId: publicGroup.id, userId: hananUser.id, groupRole: GroupRole.ANGGOTA, joinedAt: isoHoursAgo(150) },
      { groupId: privateGroup.id, userId: naqiyyahUser.id, groupRole: GroupRole.ADMIN, joinedAt: isoHoursAgo(280) },
      { groupId: privateGroup.id, userId: adminUser.id, groupRole: GroupRole.MODERATOR, joinedAt: isoHoursAgo(260) },
      { groupId: privateGroup.id, userId: demoUser.id, groupRole: GroupRole.ANGGOTA, joinedAt: isoHoursAgo(100) },
    ],
  })

  const [groupPost1, groupPost2, groupPost3] = await Promise.all([
    prisma.groupPost.create({
      data: {
        groupId: publicGroup.id,
        authorId: ustadzUser.id,
        blocks: [
          {
            type: 'markdown',
            markdown: 'Silakan absen hadir subuh ini dan tulis satu poin tadabbur dari surah yang dibaca.',
          },
        ],
        createdAt: isoHoursAgo(6),
      },
    }),
    prisma.groupPost.create({
      data: {
        groupId: publicGroup.id,
        authorId: demoUser.id,
        blocks: [
          {
            type: 'markdown',
            markdown: 'Tadabbur saya hari ini: ritme pelan ternyata membantu ayat lebih masuk.',
          },
          {
            type: 'quranQuote',
            surahNumber: 94,
            ayahNumber: 6,
            surahName: 'الشرح',
            surahNameLatin: 'Ash-Sharh',
            arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا',
            translation: 'Sesungguhnya beserta kesulitan ada kemudahan.',
          },
        ],
        createdAt: isoHoursAgo(5),
      },
    }),
    prisma.groupPost.create({
      data: {
        groupId: privateGroup.id,
        authorId: naqiyyahUser.id,
        blocks: [
          {
            type: 'markdown',
            markdown: 'Minggu ini kita bahas fase dakwah sembunyi-sembunyi. Siapkan satu pertanyaan reflektif.',
          },
        ],
        createdAt: isoHoursAgo(10),
      },
    }),
  ])

  await prisma.groupPostReaction.createMany({
    data: [
      { groupPostId: groupPost1.id, userId: demoUser.id, type: 'LIKE' },
      { groupPostId: groupPost1.id, userId: hananUser.id, type: 'LIKE' },
      { groupPostId: groupPost2.id, userId: ustadzUser.id, type: 'LIKE' },
      { groupPostId: groupPost3.id, userId: demoUser.id, type: 'LIKE' },
    ],
  })

  const groupComment1 = await prisma.groupPostComment.create({
    data: {
      groupPostId: groupPost1.id,
      authorId: demoUser.id,
      content: 'Hadir, ustadz. Poin saya hari ini tentang pentingnya ritme bacaan.',
      createdAt: isoHoursAgo(5),
    },
  })

  await prisma.groupPostComment.create({
    data: {
      groupPostId: groupPost1.id,
      authorId: ustadzUser.id,
      parentId: groupComment1.id,
      content: 'MasyaAllah, lanjutkan. Coba tulis juga bagian ayat yang paling terasa.',
      createdAt: isoHoursAgo(4),
    },
  })

  await prisma.groupMaterial.createMany({
    data: [
      {
        groupId: publicGroup.id,
        uploaderId: ustadzUser.id,
        title: 'Ringkasan Tajwid Nun Mati',
        description: 'PDF singkat untuk pemanasan setoran pekan ini.',
        type: 'pdf',
        resourceUrl: 'https://example.com/materials/tajwid-nun-mati.pdf',
        createdAt: isoHoursAgo(48),
      },
      {
        groupId: publicGroup.id,
        uploaderId: ustadzUser.id,
        title: 'Checklist Murojaah 7 Hari',
        description: 'Panduan teks untuk menjaga konsistensi hafalan harian.',
        type: 'text',
        createdAt: isoHoursAgo(36),
      },
      {
        groupId: privateGroup.id,
        uploaderId: naqiyyahUser.id,
        title: 'Daftar Episode Sirah Pekan Ini',
        description: 'Kumpulan tautan audio dan catatan ringkas.',
        type: 'link',
        resourceUrl: 'https://example.com/materials/sirah-family-circle',
        createdAt: isoHoursAgo(18),
      },
    ],
  })

  const task1 = await prisma.groupTask.create({
    data: {
      groupId: publicGroup.id,
      creatorId: ustadzUser.id,
      title: 'Setoran Surah Al-Asr',
      description: 'Kirim catatan atau refleksi singkat plus target hafalan ayat 1-3.',
      type: 'hafalan',
      surahRef: '103:1-3',
      dueDate: isoHoursAgo(-24),
      createdAt: isoHoursAgo(72),
    },
  })

  await prisma.groupTask.create({
    data: {
      groupId: publicGroup.id,
      creatorId: ustadzUser.id,
      title: 'Catatan Tadabbur Pekanan',
      description: 'Simpulkan satu pelajaran yang paling terasa minggu ini.',
      type: 'catatan',
      surahRef: '94:1-8',
      dueDate: isoHoursAgo(-96),
      createdAt: isoHoursAgo(24),
    },
  })

  await prisma.groupTaskSubmission.createMany({
    data: [
      {
        taskId: task1.id,
        userId: demoUser.id,
        content: 'Saya sudah setor ayat 1-3 dan mencatat bahwa waktu terasa sangat bernilai ketika target dibikin spesifik.',
        status: SubmissionStatus.REVISION,
        note: 'Bagus. Tolong perjelas bagian refleksi ayat kedua dan ulang makhraj pada akhir ayat.',
        submittedAt: isoHoursAgo(20),
      },
      {
        taskId: task1.id,
        userId: hananUser.id,
        content: 'Setoran selesai. Fokus saya di pengulangan tempo dan waqaf.',
        status: SubmissionStatus.ACCEPTED,
        note: 'Sudah rapi, pertahankan konsistensinya.',
        submittedAt: isoHoursAgo(18),
      },
    ],
  })

  await prisma.notification.createMany({
    data: [
      {
        userId: demoUser.id,
        actorId: hananUser.id,
        type: NotificationType.FOLLOW,
        message: 'Hanan Yusuf mulai mengikuti akun Anda.',
        isRead: false,
        createdAt: isoHoursAgo(8),
      },
      {
        userId: demoUser.id,
        actorId: ustadzUser.id,
        type: NotificationType.TASK_REVIEW,
        message: 'Setoran "Surah Al-Asr" Anda direview dan memerlukan revisi kecil.',
        isRead: false,
        createdAt: isoHoursAgo(19),
      },
      {
        userId: demoUser.id,
        actorId: naqiyyahUser.id,
        type: NotificationType.POST_LIKE,
        message: 'Naqiyyah menyukai postingan refleksi Al-Fatihah Anda.',
        isRead: true,
        createdAt: isoHoursAgo(28),
      },
      {
        userId: demoUser.id,
        actorId: ustadzUser.id,
        type: NotificationType.NEW_MATERIAL,
        message: 'Materi baru ditambahkan di Halaqah Subuh Al-Bayan.',
        isRead: true,
        createdAt: isoHoursAgo(36),
      },
    ],
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
