import { useEffect, useRef, useState } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { Bell, Plus } from 'lucide-react'

import { FeedList, PostCard, PostComposerDialog, ProfileHeader } from '@/components/social'
import {
  Button,
  Card,
  SectionHeading,
  TabsContent,
  TabsList,
  TabsRoot,
  TabsTrigger,
} from '@/components/ui'
import { useAuth } from '@/context/auth-context'
import { getNotifications, markNotificationRead } from '@/services/notification-service'
import { getExplorePosts, getFollowingFeed, getPostDetail } from '@/services/post-service'
import { getProfile, toggleFollow } from '@/services/profile-service'

function useInfiniteLoadMore(
  enabled: boolean,
  onLoad: () => void,
) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!enabled || !ref.current) {
      return
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        onLoad()
      }
    }, { rootMargin: '240px 0px' })

    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [enabled, onLoad])

  return ref
}

export function FeedScreen() {
  const { user } = useAuth()
  const feedQuery = useQuery({
    queryKey: ['feed', user?.id],
    queryFn: () => getFollowingFeed(),
    enabled: Boolean(user?.id),
  })

  if (!user) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-[var(--radius-card)] border border-black/8 bg-white/90 px-4 py-3 lg:hidden">
        <PostComposerDialog
          currentUserId={user.id}
          trigger={
            <Button size="icon" variant="secondary">
              <Plus className="h-4 w-4" />
            </Button>
          }
        />
        <p className="text-base font-semibold tracking-[0.18em] text-ink-900">Ilmuna</p>
        <Button asChild size="icon" variant="secondary">
          <Link to="/notifications">
            <Bell className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <SectionHeading
        eyebrow="Feed"
        title="Postingan dari akun yang Anda follow"
        description="Feed utama sengaja dibatasi pada relasi yang sudah Anda pilih."
        action={
          <div className="hidden lg:block">
            <PostComposerDialog
              currentUserId={user.id}
              trigger={
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Buat postingan
                </Button>
              }
            />
          </div>
        }
      />

      <FeedList
        title="Feed Anda masih kosong"
        description="Coba follow beberapa akun dulu, atau temukan konten baru lewat Explore."
        posts={feedQuery.data ?? []}
        currentUserId={user.id}
        emptyAction={
          <Button asChild>
            <Link to="/explore">Buka Explore</Link>
          </Button>
        }
      />
    </div>
  )
}

export function ExploreScreen() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'popular' | 'for-you' | 'random'>('popular')
  const query = useInfiniteQuery({
    queryKey: ['explore', user?.id, tab],
    queryFn: ({ pageParam }) => getExplorePosts(tab, 5, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(user?.id),
  })

  const posts = query.data?.pages.flatMap((page) => page.items) ?? []
  const loadMoreRef = useInfiniteLoadMore(
    Boolean(query.hasNextPage && !query.isFetchingNextPage),
    () => {
      void query.fetchNextPage()
    },
  )

  if (!user) {
    return null
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Explore"
        title="Temukan konten populer, untuk Anda, dan acak"
        description="Postingan dimuat 5 per batch agar discovery tetap ringan."
      />
      <TabsRoot value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
        <TabsList>
          <TabsTrigger value="popular">Populer</TabsTrigger>
          <TabsTrigger value="for-you">Untuk Anda</TabsTrigger>
          <TabsTrigger value="random">Acak</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-6 space-y-4">
          <FeedList
            posts={posts}
            currentUserId={user.id}
            title="Belum ada postingan"
            description="Coba lagi beberapa saat lagi."
          />
          <div ref={loadMoreRef} />
          {query.isFetchingNextPage ? (
            <Card className="text-center text-sm text-ink-500">Memuat postingan berikutnya...</Card>
          ) : null}
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
  const readMutation = useMutation({
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
        eyebrow="Notifikasi"
        title="Aktivitas terbaru"
        description="Semua interaksi penting Anda rangkum di sini."
      />
      <div className="space-y-4">
        {notificationsQuery.data?.map((notification) => (
          <Card key={notification.id} className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-ink-700">{notification.message}</p>
              <p className="mt-2 text-xs text-ink-400">{notification.createdAt}</p>
            </div>
            {!notification.isRead ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => readMutation.mutate(notification.id)}
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
    queryKey: ['profile', username],
    queryFn: () => getProfile(username, user?.id ?? null),
    enabled: Boolean(user),
  })
  const followMutation = useMutation({
    mutationFn: () => toggleFollow(user!.id, profileQuery.data!.profile.id),
    onSuccess: async (payload) => {
      queryClient.setQueryData(['profile', username], payload)
      await queryClient.invalidateQueries({ queryKey: ['feed'] })
      await queryClient.invalidateQueries({ queryKey: ['explore'] })
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
        onFollow={() => followMutation.mutate()}
      />
      {isOwner ? (
        <PostComposerDialog
          currentUserId={user.id}
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Buat postingan
            </Button>
          }
        />
      ) : null}
      <FeedList
        posts={profileQuery.data.posts}
        currentUserId={user.id}
        title="Belum ada postingan"
        description="Postingan publik dari profil ini akan muncul di sini."
      />
    </div>
  )
}

export function PostDetailScreen() {
  const { user } = useAuth()
  const { postId } = useParams({ from: '/posts/$postId' })
  const postQuery = useQuery({
    queryKey: ['post', postId],
    queryFn: () => getPostDetail(postId),
    enabled: Boolean(user),
  })

  if (!user || !postQuery.data) {
    return null
  }

  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="Postingan" title="Detail postingan" />
      <PostCard post={postQuery.data} currentUserId={user.id} showComments />
    </div>
  )
}
