import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  redirect,
  useRouterState,
} from '@tanstack/react-router'

import { AppFrame } from '@/components/layout'
import { useAuth } from '@/context/auth-context'
import { ensureSession } from '@/services/auth-service'

const publicPaths = ['/', '/login', '/register']

async function requireAuth() {
  const session = await ensureSession()
  if (!session) {
    throw redirect({ to: '/login' })
  }
  return session
}

async function requireAdmin() {
  const session = await requireAuth()
  if (session.activeRole !== 'admin') {
    throw redirect({ to: '/feed' })
  }
}

function RootShell() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const { user, isLoading } = useAuth()
  const isPublicRoute = publicPaths.includes(pathname)

  if (!isPublicRoute && isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-ink-500">Memuat sesi...</div>
  }

  if (!isPublicRoute && user) {
    return (
      <AppFrame>
        <Outlet />
      </AppFrame>
    )
  }

  return <Outlet />
}

const rootRoute = createRootRoute({
  component: RootShell,
})

const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: lazyRouteComponent(() => import('@/screens/public-screens'), 'LandingScreen'),
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: lazyRouteComponent(() => import('@/screens/public-screens'), 'LoginScreen'),
})

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: lazyRouteComponent(() => import('@/screens/public-screens'), 'RegisterScreen'),
})

const feedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/feed',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/screens/social-screens'), 'FeedScreen'),
})

const exploreRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/explore',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/screens/social-screens'), 'ExploreScreen'),
})

const notificationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/notifications',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/screens/social-screens'), 'NotificationsScreen'),
})

const postDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/posts/$postId',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/screens/social-screens'), 'PostDetailScreen'),
})

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile/$username',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/screens/social-screens'), 'ProfileScreen'),
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/screens/settings-screen'), 'SettingsScreen'),
})

const groupsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/groups',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/screens/group-screens'), 'GroupsScreen'),
})

const createGroupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/groups/create',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/screens/group-screens'), 'CreateGroupScreen'),
})

const groupDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/groups/$slug',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/screens/group-screens'), 'GroupDetailScreen'),
})

const groupMaterialsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/groups/$slug/materials',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/screens/group-screens'), 'GroupMaterialsScreen'),
})

const groupTasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/groups/$slug/tasks',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/screens/group-screens'), 'GroupTasksScreen'),
})

const groupSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/groups/$slug/settings',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/screens/group-screens'), 'GroupSettingsScreen'),
})

const groupTaskDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/groups/$slug/tasks/$taskId',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/screens/group-screens'), 'GroupTaskDetailScreen'),
})

const referencesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/references',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/screens/reference-screens'), 'ReferencesHubScreen'),
})

const quranRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/quran',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/screens/quran-screens'), 'QuranListScreen'),
})

const quranSurahRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/quran/$surahNumber',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/screens/quran-screens'), 'QuranSurahScreen'),
})

const quranBookmarksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/quran/bookmarks',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/screens/quran-screens'), 'QuranBookmarksScreen'),
})

const hadithRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/hadith',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/screens/hadith-screens'), 'HadithBooksScreen'),
})

const hadithBookRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/hadith/$bookSlug',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/screens/hadith-screens'), 'HadithBookScreen'),
})

const hadithBookmarksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/hadith/bookmarks',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/screens/hadith-screens'), 'HadithBookmarksScreen'),
})

const adminDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  beforeLoad: requireAdmin,
  component: lazyRouteComponent(() => import('@/screens/admin-screens'), 'AdminDashboardScreen'),
})

const adminUsersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/users',
  beforeLoad: requireAdmin,
  component: lazyRouteComponent(() => import('@/screens/admin-screens'), 'AdminUsersScreen'),
})

const adminGroupsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/groups',
  beforeLoad: requireAdmin,
  component: lazyRouteComponent(() => import('@/screens/admin-screens'), 'AdminGroupsScreen'),
})

const adminModerationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/moderation',
  beforeLoad: requireAdmin,
  component: lazyRouteComponent(() => import('@/screens/admin-screens'), 'AdminModerationScreen'),
})

const adminStatsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/stats',
  beforeLoad: requireAdmin,
  component: lazyRouteComponent(() => import('@/screens/admin-screens'), 'AdminStatsScreen'),
})

const routeTree = rootRoute.addChildren([
  landingRoute,
  loginRoute,
  registerRoute,
  feedRoute,
  exploreRoute,
  notificationsRoute,
  postDetailRoute,
  profileRoute,
  settingsRoute,
  groupsRoute,
  createGroupRoute,
  groupDetailRoute,
  groupMaterialsRoute,
  groupTasksRoute,
  groupSettingsRoute,
  groupTaskDetailRoute,
  referencesRoute,
  quranRoute,
  quranSurahRoute,
  quranBookmarksRoute,
  hadithRoute,
  hadithBookRoute,
  hadithBookmarksRoute,
  adminDashboardRoute,
  adminUsersRoute,
  adminGroupsRoute,
  adminModerationRoute,
  adminStatsRoute,
])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultNotFoundComponent: () => <div className="p-6">Halaman tidak ditemukan.</div>,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
