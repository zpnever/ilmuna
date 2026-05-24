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
import { getSessionUserSync } from '@/services/auth-service'

function requireAuth() {
  const session = getSessionUserSync()
  if (!session) {
    throw redirect({ to: '/login' })
  }
  return session
}

function requireAdmin() {
  const session = requireAuth()
  if (session.activeRole !== 'admin') {
    throw redirect({ to: '/feed' })
  }
}

const rootRoute = createRootRoute({
  component: () => {
    const pathname = useRouterState({
      select: (state) => state.location.pathname,
    })
    const isPublicRoute = ['/', '/login', '/register', '/verify-email'].includes(pathname)
    const session = getSessionUserSync()

    if (!isPublicRoute && session) {
      return (
        <AppFrame>
          <Outlet />
        </AppFrame>
      )
    }

    return <Outlet />
  },
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

const verifyEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/verify-email',
  component: lazyRouteComponent(() => import('@/screens/public-screens'), 'VerifyEmailScreen'),
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

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile/$username',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/screens/social-screens'), 'ProfileScreen'),
})

const groupsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/groups',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/screens/group-screens'), 'GroupsScreen'),
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

const groupTaskDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/groups/$slug/tasks/$taskId',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/screens/group-screens'), 'GroupTaskDetailScreen'),
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
  beforeLoad: () => {
    requireAuth()
    requireAdmin()
  },
  component: lazyRouteComponent(() => import('@/screens/admin-screens'), 'AdminDashboardScreen'),
})

const adminUsersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/users',
  beforeLoad: () => {
    requireAuth()
    requireAdmin()
  },
  component: lazyRouteComponent(() => import('@/screens/admin-screens'), 'AdminUsersScreen'),
})

const adminGroupsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/groups',
  beforeLoad: () => {
    requireAuth()
    requireAdmin()
  },
  component: lazyRouteComponent(() => import('@/screens/admin-screens'), 'AdminGroupsScreen'),
})

const adminModerationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/moderation',
  beforeLoad: () => {
    requireAuth()
    requireAdmin()
  },
  component: lazyRouteComponent(() => import('@/screens/admin-screens'), 'AdminModerationScreen'),
})

const adminStatsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/stats',
  beforeLoad: () => {
    requireAuth()
    requireAdmin()
  },
  component: lazyRouteComponent(() => import('@/screens/admin-screens'), 'AdminStatsScreen'),
})

const routeTree = rootRoute.addChildren([
  landingRoute,
  loginRoute,
  registerRoute,
  verifyEmailRoute,
  feedRoute,
  exploreRoute,
  notificationsRoute,
  profileRoute,
  groupsRoute,
  groupDetailRoute,
  groupMaterialsRoute,
  groupTasksRoute,
  groupTaskDetailRoute,
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
