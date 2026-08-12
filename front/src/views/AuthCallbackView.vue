<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'

const router = useRouter()

onMounted(async () => {
  // supabase-js parses the OAuth redirect hash automatically (detectSessionInUrl).
  const { data } = await supabase.auth.getSession()
  if (data.session) return router.replace('/')

  let done = false
  const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
    if (s && !done) {
      done = true
      sub.subscription.unsubscribe()
      router.replace('/')
    }
  })

  // Safety net: if no session shows up, go back to login.
  setTimeout(() => {
    if (!done) {
      sub.subscription.unsubscribe()
      router.replace('/login')
    }
  }, 6000)
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background">
    <div class="text-center">
      <div class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
      <p class="text-sm text-muted-foreground">Signing you in…</p>
    </div>
  </div>
</template>
