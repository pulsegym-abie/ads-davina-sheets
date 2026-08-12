<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useDarkMode } from '@/composables/useDarkMode'
import { Button } from '@/components/ui/button'
import { BarChart3, Loader2, Sun, Moon } from 'lucide-vue-next'

const auth = useAuthStore()
const { isDark, toggle: toggleDark } = useDarkMode()

const loadingGoogle = ref(false)
const errorMessage = ref('')

async function handleGoogleLogin() {
  loadingGoogle.value = true
  errorMessage.value = ''
  try {
    await auth.loginWithGoogle() // browser redirects to Google
  } catch {
    errorMessage.value = 'Gagal terhubung ke Google. Coba lagi.'
    loadingGoogle.value = false
  }
}
</script>

<template>
  <div class="login-stage">
    <!-- Full-bleed background with slow Ken-Burns zoom -->
    <img src="/login-ads.png" alt="" class="bg-photo" />
    <div class="bg-overlay" />

    <!-- Floating gradient orbs for depth -->
    <span class="orb orb-a" />
    <span class="orb orb-b" />
    <span class="orb orb-c" />

    <!-- Theme toggle -->
    <button class="theme-toggle" @click="toggleDark" aria-label="Toggle theme">
      <Moon v-if="!isDark" class="h-5 w-5" />
      <Sun v-else class="h-5 w-5" />
    </button>

    <!-- Left hero text (desktop) -->
    <div class="hero">
      <h2>Lihat performa<br />iklanmu<br />seketika.</h2>
      <p>Meta &amp; Google Ads dalam satu dashboard.</p>
    </div>

    <!-- Floating login card -->
    <div class="card-float">
      <div class="card">
        <div class="brand">
          <div class="brand-mark"><BarChart3 class="h-6 w-6" /></div>
        </div>

        <h1 class="title">Selamat Datang</h1>
        <p class="subtitle">Masuk untuk melihat dashboard iklan Meta &amp; Google.</p>

        <div v-if="errorMessage" class="error">{{ errorMessage }}</div>

        <Button
          class="google-btn"
          :disabled="loadingGoogle"
          @click="handleGoogleLogin"
        >
          <Loader2 v-if="loadingGoogle" class="h-5 w-5 animate-spin" />
          <svg v-else class="h-5 w-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span>{{ loadingGoogle ? 'Menghubungkan…' : 'Login with Google' }}</span>
        </Button>

        <!-- Feature chips -->
        <div class="chips">
          <span class="chip"><i class="dot dot-meta" /> Meta Ads</span>
          <span class="chip"><i class="dot dot-google" /> Google Ads</span>
          <span class="chip"><i class="dot dot-multi" /> Multi-client</span>
        </div>

        <p class="foot">Akses khusus. Login memakai akun Google yang diizinkan.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-stage {
  position: relative;
  min-height: 100vh;
  width: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0b0b0f;
}

/* ---- background photo + overlay ---- */
.bg-photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  animation: kenburns 28s ease-in-out infinite alternate;
  will-change: transform;
}
.bg-overlay {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(120% 90% at 70% 40%, rgba(0, 0, 0, 0.25) 0%, rgba(0, 0, 0, 0.62) 60%, rgba(0, 0, 0, 0.82) 100%),
    linear-gradient(90deg, rgba(9, 9, 14, 0.85) 0%, rgba(9, 9, 14, 0.35) 45%, rgba(9, 9, 14, 0.2) 100%);
}
@keyframes kenburns {
  from { transform: scale(1) translate3d(0, 0, 0); }
  to   { transform: scale(1.09) translate3d(-1.5%, -1.5%, 0); }
}

/* ---- floating gradient orbs ---- */
.orb {
  position: absolute;
  border-radius: 999px;
  filter: blur(60px);
  opacity: 0.55;
  pointer-events: none;
  will-change: transform;
}
.orb-a { width: 340px; height: 340px; left: -60px; top: 8%; background: #2563eb; animation: drift 16s ease-in-out infinite; }
.orb-b { width: 300px; height: 300px; right: 6%; bottom: -60px; background: #7c3aed; animation: drift 20s ease-in-out infinite reverse; }
.orb-c { width: 220px; height: 220px; right: 30%; top: -50px; background: #f59e0b; opacity: 0.4; animation: drift 24s ease-in-out infinite; }
@keyframes drift {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(24px, -28px, 0); }
}

/* ---- theme toggle ---- */
.theme-toggle {
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 5;
  height: 42px;
  width: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  transition: background 0.2s ease;
}
.theme-toggle:hover { background: rgba(255, 255, 255, 0.22); }

/* ---- hero (desktop only) ---- */
.hero {
  position: absolute;
  left: max(6%, 40px);
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  color: #fff;
  max-width: 460px;
  animation: rise 0.8s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.hero h2 {
  font-size: clamp(2.2rem, 4vw, 3.4rem);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.02em;
  text-shadow: 0 2px 30px rgba(0, 0, 0, 0.5);
}
.hero p {
  margin-top: 16px;
  font-size: 1.05rem;
  color: rgba(255, 255, 255, 0.82);
}
@media (max-width: 900px) { .hero { display: none; } }

/* ---- floating card ---- */
.card-float {
  position: relative;
  z-index: 3;
  margin-left: auto;
  margin-right: max(6%, 24px);
  animation: rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.05s both, bob 7s ease-in-out 1s infinite;
  will-change: transform;
}
@media (max-width: 900px) { .card-float { margin: 0 auto; } }

.card {
  width: min(92vw, 400px);
  padding: 36px 32px 30px;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(22px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow:
    0 30px 70px -20px rgba(0, 0, 0, 0.55),
    0 2px 10px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
  text-align: center;
}
:global(.dark) .card {
  background: rgba(20, 20, 26, 0.72);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow:
    0 30px 70px -20px rgba(0, 0, 0, 0.75),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.brand { display: flex; justify-content: center; margin-bottom: 18px; }
.brand-mark {
  height: 56px;
  width: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  color: #fff;
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  box-shadow: 0 10px 24px -6px rgba(37, 99, 235, 0.6);
}

.title {
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #0f0f14;
}
:global(.dark) .title { color: #f5f5f7; }

.subtitle {
  margin-top: 6px;
  font-size: 0.9rem;
  color: #52525b;
}
:global(.dark) .subtitle { color: #a1a1aa; }

.error {
  margin-top: 16px;
  border-radius: 12px;
  border: 1px solid rgba(220, 38, 38, 0.3);
  background: rgba(220, 38, 38, 0.1);
  padding: 10px 14px;
  font-size: 0.82rem;
  color: #dc2626;
}

.google-btn {
  margin-top: 22px;
  width: 100%;
  height: 52px;
  gap: 12px;
  border-radius: 14px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #1f2937;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 6px 18px -6px rgba(0, 0, 0, 0.25);
  transition: transform 0.15s ease, box-shadow 0.2s ease;
}
.google-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 26px -8px rgba(0, 0, 0, 0.35);
  background: #fff;
}
:global(.dark) .google-btn {
  color: #f5f5f7;
  background: #26262e;
  border-color: rgba(255, 255, 255, 0.12);
}
:global(.dark) .google-btn:hover:not(:disabled) { background: #2f2f38; }

.chips {
  margin-top: 22px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #3f3f46;
  background: rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.06);
  padding: 5px 10px;
  border-radius: 999px;
}
:global(.dark) .chip {
  color: #d4d4d8;
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.08);
}
.dot { width: 7px; height: 7px; border-radius: 999px; display: inline-block; }
.dot-meta { background: #2563eb; }
.dot-google { background: #f59e0b; }
.dot-multi { background: #10b981; }

.foot {
  margin-top: 20px;
  font-size: 0.72rem;
  color: #71717a;
}
:global(.dark) .foot { color: #8b8b93; }

/* ---- entrance + float ---- */
@keyframes rise {
  from { opacity: 0; transform: translateY(26px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-9px); }
}

@media (prefers-reduced-motion: reduce) {
  .bg-photo, .orb, .card-float, .hero { animation: none !important; }
}
</style>
