import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { Bell, Compass, Search } from 'lucide-react'

import { FeedList, PostComposer, ProfileHeader } from '@/components/social'
import { Badge, Button, Card, EmptyState, Input, SectionHeading, TabsContent, TabsList, TabsRoot, TabsTrigger } from '@/components/ui'
import { useAuth } from '@/context/auth-context'
import { getNotifications, markNotificationRead } from '@/services/notification-service'
import { getExplorePosts, getFollowingFeed } from '@/services/post-service'
import { getProfile, toggleFollow } from '@/services/profile-service'

export function FeedScreen() {
  const { user } = useAuth()
  const feedQuery = useQuery({
    queryKey: ['feed', user?.id],
    queryFn: () => getFollowingFeed(user!.id),
    enabled: Boolean(user?.id),
  })

  if (!user) {
    return null
  }

  return (
    <div className="space-y-6">
      <PostComposer currentUserId={user.id} />
      <SectionHeading
        eyebrow="Feed"
        title="Postingan dari akun yang Anda follow"
        description="Feed utama sengaja dibatasi hanya untuk relasi yang sudah Anda pilih, agar ritme belajar tetap fokus."
      />
      <FeedList
        title="Feed Anda masih kosong"
        description="Coba follow beberapa akun dulu, atau temukan konten baru lewat Explore."
        posts={feedQuery.data ?? []}
        currentUserId={user.id}
        emptyAction={
          <Button asChild>
            <Link to="/explore">
              <Compass className="mr-2 h-4 w-4" />
              Buka Explore
            </Link>
          </Button>
        }
      />
    </div>
  )
}

export function ExploreScreen() {
  const { user } = useAuth()
  const [tab, setTab] = useState('popular')
  const [search, setSearch] = useState('')
  const exploreQuery = useQuery({
    queryKey: ['explore', user?.id],
    queryFn: () => getExplorePosts(user!),
    enabled: Boolean(user),
  })

  if (!user) {
    return null
  }

  const collections = {
    popular: exploreQuery.data?.popular ?? [],
    forYou: exploreQuery.data?.forYou ?? [],
    random: exploreQuery.data?.random ?? [],
  }

  const visiblePosts = collections[tab as keyof typeof collections].filter((post) => {
    const term = search.trim().toLowerCase()
    if (!term) {
      return true
    }
    return (
      post.authorName.toLowerCase().includes(term) ||
      post.tags.some((tag) => tag.toLowerCase().includes(term))
    )
  })

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Explore"
        title="Temukan postingan populer, FYP, dan discovery baru"
        description="Explore dipisahkan dari feed supaya Anda bisa menjelajah saat sengaja ingin mencari perspektif baru."
        action={
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-11"
              placeholder="Cari author atau tag"
            />
          </div>
        }
      />
      <TabsRoot value={tab} onValueChange={setTab} className="space-y-5">
        <TabsList>
          <TabsTrigger value="popular">Populer</TabsTrigger>
          <TabsTrigger value="forYou">Untuk Anda</TabsTrigger>
          <TabsTrigger value="random">Acak</TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>
          <FeedList
            title="Belum ada post di Explore"
            description="Dataset dummy belum menghasilkan post untuk filter ini."
            posts={visiblePosts}
            currentUserId={user.id}
          />
        </TabsContent>
      </TabsRoot>
    </div>
  )
}

export function NotificationsScreen() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const notificationsQuery = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => getNotifications(user!.id),
    enabled: Boolean(user?.id),
  })
  const mutation = useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] })
    },
  })

  if (!user) {
    return null
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Inbox"
        title="Notifikasi aplikasi"
        description="Follow baru, like, komentar, materi, tugas, dan hasil review semuanya terkumpul di sini."
      />
      <div className="space-y-4">
        {notificationsQuery.data?.map((notification) => (
          <Card key={notification.id} className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 rounded-2xl bg-gold-400/12 p-3 text-gold-500">
                <Bell className="h-4 w-4" />
              </div>
              <div className="space-y-2">
                <p className="text-sm leading-7 text-ink-700">{notification.message}</p>
                <div className="flex items-center gap-2">
                  {!notification.isRead ? <Badge variant="gold">Baru</Badge> : <Badge variant="outline">Sudah dibaca</Badge>}
                </div>
              </div>
            </div>
            {!notification.isRead ? (
              <Button
                variant="secondary"
                size="sm"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate(notification.id)}
              >
                Tandai dibaca
              </Button>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  )
}

export function ProfileScreen() {
  const { user } = useAuth()
  const { username } = useParams({ from: '/profile/$username' })
  const queryClient = useQueryClient()
  const profileQuery = useQuery({
    queryKey: ['profile', username, user?.id],
    queryFn: () => getProfile(username, user?.id ?? null),
    enabled: Boolean(username),
  })
  const mutation = useMutation({
    mutationFn: () => toggleFollow(user!.id, profileQuery.data!.profile.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile', username] })
      await queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })

  if (!user || !profileQuery.data) {
    return null
  }

  const isOwner = profileQuery.data.profile.id === user.id

  return (
    <div className="space-y-6">
      <ProfileHeader
        profile={profileQuery.data.profile}
        isOwner={isOwner}
        onToggleFollow={() => mutation.mutate()}
        isPending={mutation.isPending}
      />
      {isOwner ? <PostComposer currentUserId={user.id} /> : null}
      <SectionHeading
        eyebrow="Profil Publik"
        title={`Postingan @${profileQuery.data.profile.username}`}
        description="Semua post publik pengguna tampil di sini bersama metadata profilnya."
      />
      {profileQuery.data.posts.length ? (
        <FeedList
          title="Belum ada postingan"
          description="Pengguna ini belum membagikan post publik."
          posts={profileQuery.data.posts.map((post) => ({
            ...post,
            authorName: profileQuery.data.profile.name,
            authorUsername: profileQuery.data.profile.username,
            authorAvatar: profileQuery.data.profile.avatarUrl,
            commentCount: 0,
            engagementScore: 0,
            isHidden: false,
          }))}
          currentUserId={user.id}
        />
      ) : (
        <EmptyState
          title="Belum ada postingan publik"
          description="Saat pengguna ini mulai menulis, daftar postingannya akan muncul di sini."
        />
      )}
      {isOwner ? (
        <Card className="space-y-3">
          <p className="text-sm font-semibold text-ink-900">Minat yang memengaruhi Explore</p>
          <div className="flex flex-wrap gap-2">
            {user.interests.map((interest) => (
              <Badge key={interest} variant="gold">
                {interest}
              </Badge>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  )
}
