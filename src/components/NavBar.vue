<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { setLocale } from '../i18n'
import { Menu, X, Languages } from '@lucide/vue'

const { t, locale } = useI18n()

const open = ref(false)
const scrolled = ref(false)

const links = [
  { to: '/models',           labelKey: 'nav.models' },
  { to: '/pricing',          labelKey: 'nav.pricing' },
  { to: '/agents',           labelKey: 'nav.agents' },
  { to: '/#inspiration',     labelKey: 'nav.inspiration' },
  { to: '/#faq',             labelKey: 'nav.faq' }
]

const onScroll = () => { scrolled.value = window.scrollY > 8 }

onMounted(() => { window.addEventListener('scroll', onScroll, { passive: true }); onScroll() })
onUnmounted(() => window.removeEventListener('scroll', onScroll))

const otherLocale = computed(() => locale.value === 'en' ? 'zh' : 'en')
const otherLabel  = computed(() => locale.value === 'en' ? t('common.lang.zh') : t('common.lang.en'))
function toggleLocale() {
  setLocale(otherLocale.value)
}
</script>

<template>
  <header
    class="sticky top-0 z-50 transition-all duration-300"
    :class="scrolled ? 'glass-strong border-b border-white/5' : 'bg-transparent'"
  >
    <div class="container-x flex h-16 items-center justify-between">
      <router-link to="/" class="flex items-center gap-2.5 group">
        <span class="relative inline-flex h-8 w-8 items-center justify-center rounded-xl bg-brand-gradient shadow-glow-brand overflow-hidden">
          <svg viewBox="0 0 64 64" class="h-8 w-8" aria-hidden="true">
            <g>
              <rect x="10" y="34" width="32" height="7" rx="2.5" fill="rgba(255,255,255,0.4)"/>
              <rect x="13" y="25" width="34" height="7" rx="2.5" fill="rgba(255,255,255,0.6)"/>
              <rect x="16" y="16" width="36" height="7" rx="2.5" fill="rgba(255,255,255,0.85)"/>
              <rect x="19" y="7"  width="30" height="7" rx="2.5" fill="white"/>
            </g>
          </svg>
        </span>
        <span class="text-lg font-semibold tracking-tight">
          <span class="grad-text">Package</span>
        </span>
      </router-link>

      <nav class="hidden md:flex items-center gap-1">
        <router-link
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="px-3 py-1.5 text-sm text-ink-300 hover:text-white transition-colors rounded-md hover:bg-white/5"
        >{{ t(l.labelKey) }}</router-link>
      </nav>

      <div class="hidden md:flex items-center gap-2">
        <button
          @click="toggleLocale"
          class="inline-flex items-center gap-1.5 text-sm text-ink-300 hover:text-white px-3 py-1.5 rounded-md hover:bg-white/5 transition-colors"
          :aria-label="locale === 'en' ? 'Switch to Chinese' : '切换到英文'"
          :title="locale === 'en' ? '切换到中文' : 'Switch to English'"
        >
          <Languages class="h-3.5 w-3.5" />
          {{ otherLabel }}
        </button>
        <a href="#" class="text-sm text-ink-300 hover:text-white px-3 py-1.5">{{ t('nav.support') }}</a>
        <a href="#" class="text-sm text-ink-300 hover:text-white px-3 py-1.5">{{ t('nav.developer') }}</a>
        <router-link to="/try" class="btn btn-primary text-sm">
          {{ t('nav.getStarted') }}
          <span aria-hidden="true">→</span>
        </router-link>
      </div>

      <button
        class="md:hidden p-2 rounded-md hover:bg-white/5"
        @click="open = !open"
        :aria-label="open ? 'Close menu' : 'Open menu'"
      >
        <component :is="open ? X : Menu" class="h-5 w-5" />
      </button>
    </div>

    <div v-if="open" class="md:hidden glass-strong border-t border-white/5">
      <div class="container-x py-3 flex flex-col gap-1">
        <router-link
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="px-3 py-2 text-sm text-ink-200 hover:bg-white/5 rounded-md"
          @click="open = false"
        >{{ t(l.labelKey) }}</router-link>
        <button
          @click="toggleLocale(); open = false"
          class="px-3 py-2 text-sm text-ink-200 hover:bg-white/5 rounded-md text-left inline-flex items-center gap-2"
        >
          <Languages class="h-3.5 w-3.5" /> {{ otherLabel }}
        </button>
        <router-link to="/try" class="btn btn-primary mt-2 text-sm" @click="open = false">
          {{ t('nav.getStarted') }} →
        </router-link>
      </div>
    </div>
  </header>
</template>