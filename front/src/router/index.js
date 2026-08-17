import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import LoginView from '@/views/LoginView.vue'
import AuthCallbackView from '@/views/AuthCallbackView.vue'
import AdsReportView from '@/views/AdsReportView.vue'
import SaldoAdsView from '@/views/SaldoAdsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { guest: true },
    },
    {
      path: '/auth/callback',
      name: 'auth-callback',
      component: AuthCallbackView,
    },
    {
      path: '/',
      name: 'dashboard',
      component: AdsReportView,
      meta: { requiresAuth: true },
    },
    {
      path: '/saldo-ads',
      name: 'saldo-ads',
      component: SaldoAdsView,
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  // Wait for the persisted-session check (main.js kicks it off, but on a
  // fresh/direct navigation this guard can run before it resolves) so we
  // never redirect based on a not-yet-loaded auth state.
  await auth.init()
  if (to.meta.requiresAuth && !auth.isLoggedIn) return { name: 'login' }
  if (to.meta.guest && auth.isLoggedIn) return { name: 'dashboard' }
})

export default router
