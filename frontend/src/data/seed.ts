import type {
	DemoDatabase,
	FollowRelation,
	Group,
	GroupMember,
	NotificationItem,
	Post,
	TaskSubmission,
	User,
} from "@/types/domain";

const now = Date.now();

function iso(offsetHours: number) {
	return new Date(now - offsetHours * 60 * 60 * 1000).toISOString();
}

export const DEMO_CREDENTIALS = {
	email: "ilmuna@gmail.com",
	password: "10203040",
};

export const demoUsers: User[] = [
	{
		id: "user-demo",
		username: "ilmuna",
		name: "Ilmuna Demo",
		email: DEMO_CREDENTIALS.email,
		role: "member",
		bio: "Belajar rutin, senang tafsir tematik, dan sedang membangun kebiasaan murojaah harian.",
		location: "Jakarta",
		website: "https://ilmuna.id/demo",
		avatarUrl: "/avatars/suko.png",
		coverUrl:
			"https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=1200&q=80",
		interests: ["tafsir", "akhlak", "komunitas", "hadith"],
		emailVerified: true,
		isVerified: true,
		joinedAt: iso(2400),
	},
	{
		id: "user-1",
		username: "ustadzfahmi",
		name: "Ustadz Fahmi",
		email: "fahmi@ilmuna.id",
		role: "ustadz",
		bio: "Mengajar tahsin, tafsir ringkas, dan kelas hafalan untuk keluarga muda.",
		location: "Bandung",
		website: "https://ilmuna.id/fahmi",
		avatarUrl: "/avatars/danush.jpeg",
		coverUrl:
			"https://images.unsplash.com/photo-1496065187959-7f07b8353c55?auto=format&fit=crop&w=1200&q=80",
		interests: ["hafalan", "tajwid", "tafsir"],
		emailVerified: true,
		isVerified: true,
		joinedAt: iso(3000),
	},
	{
		id: "user-2",
		username: "naqiyyah",
		name: "Naqiyyah Putri",
		email: "naqiyyah@ilmuna.id",
		role: "member",
		bio: "Suka merangkum kajian dan berbagi catatan tadabbur yang ringan.",
		location: "Yogyakarta",
		website: "https://ilmuna.id/naqiyyah",
		avatarUrl: "/avatars/willdan.png",
		coverUrl:
			"https://images.unsplash.com/photo-1491895200222-0fc4a4c35e18?auto=format&fit=crop&w=1200&q=80",
		interests: ["akhlak", "sirah", "keluarga"],
		emailVerified: true,
		isVerified: false,
		joinedAt: iso(1800),
	},
	{
		id: "user-3",
		username: "adminfatimah",
		name: "Fatimah Admin",
		email: "admin@ilmuna.id",
		role: "admin",
		bio: "Menjaga pengalaman belajar tetap aman, bersih, dan fokus.",
		location: "Surabaya",
		website: "https://ilmuna.id/admin",
		avatarUrl: "/avatars/suko.png",
		coverUrl:
			"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
		interests: ["moderasi", "komunitas", "produk"],
		emailVerified: true,
		isVerified: true,
		joinedAt: iso(3600),
	},
	{
		id: "user-4",
		username: "hanan",
		name: "Hanan Yusuf",
		email: "hanan@ilmuna.id",
		role: "member",
		bio: "Sedang fokus membangun komunitas belajar selepas subuh.",
		location: "Makassar",
		website: "https://ilmuna.id/hanan",
		avatarUrl: "/avatars/danush.jpeg",
		coverUrl:
			"https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=80",
		interests: ["komunitas", "hafalan", "sirah"],
		emailVerified: true,
		isVerified: false,
		joinedAt: iso(1500),
	},
];

const follows: FollowRelation[] = [
	{
		id: "follow-1",
		followerId: "user-demo",
		followingId: "user-1",
		createdAt: iso(200),
	},
	{
		id: "follow-2",
		followerId: "user-demo",
		followingId: "user-2",
		createdAt: iso(150),
	},
	{
		id: "follow-3",
		followerId: "user-2",
		followingId: "user-1",
		createdAt: iso(130),
	},
	{
		id: "follow-4",
		followerId: "user-4",
		followingId: "user-demo",
		createdAt: iso(120),
	},
];

function richText(html: string) {
	return {
		type: "richText" as const,
		html,
	};
}

function quranQuote(
	surahNumber: number,
	ayahNumber: number,
	surahName: string,
	surahNameLatin: string,
	arabic: string,
	translation: string,
) {
	return {
		type: "quranQuote" as const,
		surahNumber,
		ayahNumber,
		surahName,
		surahNameLatin,
		arabic,
		translation,
	};
}

export const seedPosts: Post[] = [
	{
		id: "post-1",
		authorId: "user-1",
		content: [
			richText(
				"<p>Mengulang pelajaran malam ini: target kecil yang konsisten sering lebih kuat daripada target besar yang cepat padam.</p>",
			),
			quranQuote(
				94,
				5,
				"الشرح",
				"Ash-Sharh",
				"فَإِنَّ مَعَ الْعُسْرِ يُسْرًا",
				"Maka sesungguhnya beserta kesulitan ada kemudahan.",
			),
		],
		images: [],
		visibility: "public",
		tags: ["tafsir", "akhlak"],
		createdAt: iso(4),
		likeUserIds: ["user-demo", "user-2", "user-4"],
		dislikeUserIds: [],
		shareCount: 5,
	},
	{
		id: "post-2",
		authorId: "user-2",
		content: [
			richText(
				"<p>Catatan kajian hari ini: adab menuntut ilmu bukan hanya duduk tenang, tapi juga menjaga niat saat ilmu mulai terasa “berhasil”.</p>",
			),
		],
		images: [
			"https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80",
		],
		visibility: "public",
		tags: ["akhlak", "komunitas"],
		createdAt: iso(12),
		likeUserIds: ["user-demo", "user-1"],
		dislikeUserIds: [],
		shareCount: 3,
	},
	{
		id: "post-3",
		authorId: "user-4",
		content: [
			richText(
				"<p>Lagi eksperimen format halaqah subuh 20 menit. Ternyata justru yang singkat begini bikin jamaah lebih rutin hadir.</p>",
			),
		],
		images: [],
		visibility: "public",
		tags: ["komunitas", "sirah"],
		createdAt: iso(7),
		likeUserIds: ["user-1"],
		dislikeUserIds: [],
		shareCount: 1,
	},
	{
		id: "post-4",
		authorId: "user-demo",
		content: [
			richText(
				"<p>Baru selesai baca ulang Al-Fatihah dengan tafsir ringkas. Rasanya ayat yang sudah hafal bertahun-tahun tetap bisa membuka sudut pandang baru.</p>",
			),
		],
		images: [],
		visibility: "public",
		tags: ["tafsir", "hadith"],
		createdAt: iso(30),
		likeUserIds: ["user-2"],
		dislikeUserIds: [],
		shareCount: 0,
	},
	{
		id: "post-5",
		authorId: "user-1",
		content: [
			richText(
				"<p>Untuk santri grup tahfizh, pekan ini cukup setor 5 ayat dulu tapi benar makhrajnya. Kualitas lebih penting dari tergesa-gesa.</p>",
			),
		],
		images: [],
		visibility: "public",
		tags: ["hafalan", "tajwid"],
		createdAt: iso(21),
		likeUserIds: ["user-demo", "user-2", "user-4", "user-3"],
		dislikeUserIds: [],
		shareCount: 7,
	},
	{
		id: "post-6",
		authorId: "user-2",
		content: [
			richText(
				"<p>Checklist kecil buat akhir pekan: satu halaman Qur’an, satu hadis, dan satu tindakan baik yang tidak diumumkan ke siapa-siapa.</p>",
			),
			quranQuote(
				103,
				3,
				"العصر",
				"Al-Asr",
				"إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ",
				"Kecuali orang-orang yang beriman dan mengerjakan kebajikan.",
			),
		],
		images: [],
		visibility: "public",
		tags: ["akhlak", "quran"],
		createdAt: iso(2),
		likeUserIds: ["user-demo", "user-1", "user-4"],
		dislikeUserIds: [],
		shareCount: 6,
	},
];

export const seedComments = [
	{
		id: "comment-1",
		postId: "post-1",
		authorId: "user-demo",
		parentId: null,
		content:
			"Bagian target kecil ini kena sekali. Selama ini saya sering keburu muluk.",
		createdAt: iso(3),
	},
	{
		id: "comment-2",
		postId: "post-1",
		authorId: "user-1",
		parentId: "comment-1",
		content: "Pelan tapi rutin biasanya lebih tahan lama. Semoga dimudahkan.",
		createdAt: iso(2.5),
	},
	{
		id: "comment-3",
		postId: "post-2",
		authorId: "user-4",
		parentId: null,
		content:
			"Catatannya rapih sekali. Boleh saya pakai untuk sesi remaja pekan ini?",
		createdAt: iso(9),
	},
];

export const seedGroups: Group[] = [
	{
		id: "group-1",
		name: "Halaqah Subuh Al-Bayan",
		slug: "halaqah-subuh-al-bayan",
		description:
			"Komunitas belajar Qur’an selepas subuh dengan fokus tadabbur, hafalan ringan, dan diskusi praktik.",
		isPublic: true,
		inviteCode: "ALBAYAN24",
		coverUrl:
			"https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1200&q=80",
		tags: ["hafalan", "komunitas", "subuh"],
		createdAt: iso(600),
		forumPosts: [
			{
				id: "forum-1",
				authorId: "user-1",
				content:
					"Silakan absen hadir subuh ini dan tulis satu poin tadabbur dari surah yang dibaca.",
				createdAt: iso(6),
			},
			{
				id: "forum-2",
				authorId: "user-demo",
				content:
					"Tadabbur saya hari ini: ritme pelan ternyata membantu ayat lebih “masuk”.",
				createdAt: iso(5),
			},
		],
		materials: [
			{
				id: "material-1",
				title: "Ringkasan Tajwid Nun Mati",
				description: "PDF singkat untuk pemanasan setoran pekan ini.",
				type: "pdf",
				resourceUrl: "#",
				createdAt: iso(48),
			},
			{
				id: "material-2",
				title: "Checklist Murojaah 7 Hari",
				description: "Panduan teks untuk menjaga konsistensi hafalan harian.",
				type: "text",
				createdAt: iso(36),
			},
		],
		tasks: [
			{
				id: "task-1",
				groupId: "group-1",
				title: "Setoran Surah Al-Asr",
				description:
					"Kirim catatan atau refleksi singkat plus target hafalan ayat 1-3.",
				type: "hafalan",
				surahRef: "103:1-3",
				dueDate: iso(-24),
				createdAt: iso(72),
			},
			{
				id: "task-2",
				groupId: "group-1",
				title: "Catatan Tadabbur Pekanan",
				description: "Simpulkan satu pelajaran yang paling terasa minggu ini.",
				type: "catatan",
				surahRef: "94:1-8",
				dueDate: iso(-96),
				createdAt: iso(24),
			},
		],
	},
	{
		id: "group-2",
		name: "Sirah Family Circle",
		slug: "sirah-family-circle",
		description:
			"Grup publik untuk keluarga muda yang ingin belajar sirah nabawiyah secara bertahap dan membumi.",
		isPublic: true,
		inviteCode: "SIRAHFAM",
		coverUrl:
			"https://images.unsplash.com/photo-1475776408506-9a5371e7a068?auto=format&fit=crop&w=1200&q=80",
		tags: ["sirah", "keluarga"],
		createdAt: iso(400),
		forumPosts: [
			{
				id: "forum-3",
				authorId: "user-2",
				content:
					"Minggu ini kita bahas fase dakwah sembunyi-sembunyi. Siapkan satu pertanyaan reflektif.",
				createdAt: iso(10),
			},
		],
		materials: [
			{
				id: "material-3",
				title: "Daftar Episode Sirah Pekan Ini",
				description: "Kumpulan tautan audio dan catatan ringkas.",
				type: "link",
				resourceUrl: "#",
				createdAt: iso(18),
			},
		],
		tasks: [],
	},
];

export const seedGroupMembers: GroupMember[] = [
	{
		id: "member-1",
		groupId: "group-1",
		userId: "user-1",
		groupRole: "ustadz",
		joinedAt: iso(550),
	},
	{
		id: "member-2",
		groupId: "group-1",
		userId: "user-demo",
		groupRole: "student",
		joinedAt: iso(200),
	},
	{
		id: "member-3",
		groupId: "group-1",
		userId: "user-4",
		groupRole: "student",
		joinedAt: iso(150),
	},
	{
		id: "member-4",
		groupId: "group-2",
		userId: "user-2",
		groupRole: "moderator",
		joinedAt: iso(280),
	},
	{
		id: "member-5",
		groupId: "group-2",
		userId: "user-demo",
		groupRole: "student",
		joinedAt: iso(100),
	},
];

export const seedSubmissions: TaskSubmission[] = [
	{
		id: "submission-1",
		taskId: "task-1",
		userId: "user-demo",
		content:
			"Saya sudah setor ayat 1-3 dan mencatat bahwa waktu terasa sangat bernilai ketika target dibikin spesifik.",
		status: "revision",
		note: "Bagus. Tolong perjelas bagian refleksi ayat kedua dan ulang makhraj pada akhir ayat.",
		submittedAt: iso(20),
	},
	{
		id: "submission-2",
		taskId: "task-1",
		userId: "user-4",
		content: "Setoran selesai. Fokus saya di pengulangan tempo dan waqaf.",
		status: "accepted",
		note: "Sudah rapi, pertahankan konsistensinya.",
		submittedAt: iso(18),
	},
];

export const seedNotifications: NotificationItem[] = [
	{
		id: "notif-1",
		userId: "user-demo",
		actorId: "user-4",
		type: "follow",
		message: "Hanan Yusuf mulai mengikuti akun Anda.",
		isRead: false,
		createdAt: iso(8),
	},
	{
		id: "notif-2",
		userId: "user-demo",
		actorId: "user-1",
		type: "task_review",
		message:
			'Setoran "Surah Al-Asr" Anda direview dan memerlukan revisi kecil.',
		isRead: false,
		createdAt: iso(19),
	},
	{
		id: "notif-3",
		userId: "user-demo",
		actorId: "user-2",
		type: "post_like",
		message: "Naqiyyah menyukai postingan refleksi Al-Fatihah Anda.",
		isRead: true,
		createdAt: iso(28),
	},
	{
		id: "notif-4",
		userId: "user-demo",
		actorId: "user-1",
		type: "new_material",
		message: "Materi baru ditambahkan di Halaqah Subuh Al-Bayan.",
		isRead: true,
		createdAt: iso(36),
	},
];

export const seedModeration = [
	{
		postId: "post-1",
		status: "visible" as const,
		reason: "",
		updatedAt: iso(4),
	},
	{
		postId: "post-2",
		status: "visible" as const,
		reason: "",
		updatedAt: iso(12),
	},
	{
		postId: "post-3",
		status: "visible" as const,
		reason: "",
		updatedAt: iso(7),
	},
	{
		postId: "post-4",
		status: "visible" as const,
		reason: "",
		updatedAt: iso(30),
	},
	{
		postId: "post-5",
		status: "visible" as const,
		reason: "",
		updatedAt: iso(21),
	},
	{
		postId: "post-6",
		status: "visible" as const,
		reason: "",
		updatedAt: iso(2),
	},
];

export function createSeedDatabase(): DemoDatabase {
	return {
		users: demoUsers,
		follows,
		posts: seedPosts,
		comments: seedComments,
		groups: seedGroups,
		groupMembers: seedGroupMembers,
		submissions: seedSubmissions,
		quranBookmarks: [],
		hadithBookmarks: [],
		notifications: seedNotifications,
		moderation: seedModeration,
	};
}
