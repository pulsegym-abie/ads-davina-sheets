<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import PlatformLogo from '@/components/PlatformLogo.vue'
import { Check } from 'lucide-vue-next'

const props = defineProps({
  platform: { type: String, default: 'meta' },
})

const isMeta = computed(() => props.platform === 'meta')
const brand = computed(() => (isMeta.value ? 'Meta Marketing API' : 'Google Ads API'))

// Staged messages that read like a real API sync. Platform-aware wording.
const steps = computed(() => [
  `Menghubungkan ke ${brand.value}`,
  'Autentikasi OAuth 2.0',
  isMeta.value ? 'Mengambil campaign & ad set' : 'Mengambil data campaign',
  'Menghitung metrik performa',
])

// `current` = number of completed steps; steps[current] is the one in progress.
const current = ref(0)
let timer = null
onMounted(() => {
  timer = setInterval(() => {
    if (current.value < steps.value.length) current.value++
  }, 600)
})
onUnmounted(() => clearInterval(timer))

const progress = computed(() =>
  Math.min(100, Math.round(((current.value + 0.35) / steps.value.length) * 100)),
)

const stateOf = (i) => (i < current.value ? 'done' : i === current.value ? 'active' : 'pending')
</script>

<template>
  <div class="fetch-card" :class="isMeta ? 'accent-meta' : 'accent-google'">
    <!-- Radar / network pulse behind the logo -->
    <div class="radar">
      <span class="ring" />
      <span class="ring ring-2" />
      <span class="ring ring-3" />
      <div class="logo-wrap">
        <PlatformLogo :platform="platform" size="lg" />
      </div>
    </div>

    <div class="head">
      <h3 class="title">Menyinkronkan data iklan</h3>
      <p class="subtitle">
        <span class="live-dot" /> {{ brand }}
      </p>
    </div>

    <!-- Staged steps -->
    <ul class="steps">
      <li v-for="(s, i) in steps" :key="i" class="step" :data-state="stateOf(i)">
        <span class="step-icon">
          <Check v-if="stateOf(i) === 'done'" class="h-3.5 w-3.5" />
          <span v-else-if="stateOf(i) === 'active'" class="spinner" />
          <span v-else class="dot" />
        </span>
        <span class="step-label">{{ s }}<span v-if="stateOf(i) === 'active'" class="ellipsis" /></span>
      </li>
    </ul>

    <!-- Progress -->
    <div class="bar">
      <div class="bar-fill" :style="{ width: progress + '%' }" />
    </div>
  </div>
</template>

<style scoped>
.fetch-card {
  --accent: 59 130 246;            /* meta blue (rgb) */
  min-height: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 40px 24px;
  border-radius: 16px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--card));
  position: relative;
  overflow: hidden;
}
.accent-google { --accent: 245 158 11; } /* amber */

/* ---- radar ---- */
.radar {
  position: relative;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.logo-wrap { position: relative; z-index: 2; }
.ring {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 56px;
  height: 56px;
  border-radius: 999px;
  border: 1.5px solid rgb(var(--accent) / 0.5);
  animation: radar 2.4s ease-out infinite;
}
.ring-2 { animation-delay: 0.8s; }
.ring-3 { animation-delay: 1.6s; }
@keyframes radar {
  0%   { transform: scale(0.5); opacity: 0.9; }
  100% { transform: scale(2.3); opacity: 0; }
}

/* ---- head ---- */
.head { text-align: center; }
.title {
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: hsl(var(--foreground));
}
.subtitle {
  margin-top: 4px;
  font-size: 0.8rem;
  color: hsl(var(--muted-foreground));
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: rgb(var(--accent));
  box-shadow: 0 0 0 0 rgb(var(--accent) / 0.6);
  animation: live 1.4s ease-out infinite;
}
@keyframes live {
  0%   { box-shadow: 0 0 0 0 rgb(var(--accent) / 0.5); }
  100% { box-shadow: 0 0 0 8px rgb(var(--accent) / 0); }
}

/* ---- steps ---- */
.steps {
  width: 100%;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.step {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.85rem;
  transition: opacity 0.3s ease;
}
.step[data-state='pending'] { opacity: 0.4; }
.step[data-state='done'] { opacity: 0.85; }
.step-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.step[data-state='done'] .step-icon {
  background: rgb(var(--accent));
  color: #fff;
}
.step[data-state='active'] .step-icon { color: rgb(var(--accent)); }
.step-label { color: hsl(var(--foreground)); }
.step[data-state='active'] .step-label { font-weight: 600; }

.dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: hsl(var(--muted-foreground));
}
.spinner {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 2px solid rgb(var(--accent) / 0.25);
  border-top-color: rgb(var(--accent));
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* animated "..." on the active step */
.ellipsis::after {
  content: '';
  animation: ellipsis 1.2s steps(4, end) infinite;
}
@keyframes ellipsis {
  0%   { content: ''; }
  25%  { content: '.'; }
  50%  { content: '..'; }
  75%  { content: '...'; }
}

/* ---- progress bar ---- */
.bar {
  width: 100%;
  max-width: 320px;
  height: 5px;
  border-radius: 999px;
  background: hsl(var(--muted));
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgb(var(--accent) / 0.6), rgb(var(--accent)));
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
