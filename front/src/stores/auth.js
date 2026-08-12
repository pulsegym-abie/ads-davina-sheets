import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const session = ref(null)
  const ready = ref(false)

  const user = computed(() => session.value?.user ?? null)
  const isLoggedIn = computed(() => !!session.value)
  const displayName = computed(
    () => user.value?.user_metadata?.name || user.value?.email || 'User',
  )

  // Called once on app start (main.js) — loads any persisted session and keeps
  // it in sync with Supabase (login/logout/token refresh).
  async function init() {
    const { data } = await supabase.auth.getSession()
    session.value = data.session
    ready.value = true
    supabase.auth.onAuthStateChange((_event, s) => {
      session.value = s
    })
  }

  async function loginWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback' },
    })
  }

  async function logout() {
    await supabase.auth.signOut()
    session.value = null
  }

  return { session, user, ready, isLoggedIn, displayName, init, loginWithGoogle, logout }
})
