<script setup>
import { useI18n } from 'vue-i18n'
import { BookOpen, Film, Palette, Mic, ArrowRight, Sparkles, Layers, Wand2, CheckCircle2 } from '@lucide/vue'

const { t } = useI18n()

const agents = [
  {
    icon: BookOpen,
    key: 'agents.1',
    accent: 'cyan',
    capabilities: ['agents.cap.splitShots', 'agents.cap.characterDesign', 'agents.cap.voiceOver', 'agents.cap.stitchVideo']
  },
  {
    icon: Film,
    key: 'agents.2',
    accent: 'violet',
    capabilities: ['agents.cap.longForm', 'agents.cap.frameLock', 'agents.cap.shotList', 'agents.cap.narrative']
  },
  {
    icon: Palette,
    key: 'agents.3',
    accent: 'pink',
    capabilities: ['agents.cap.styleTransfer', 'agents.cap.characterPersist', 'agents.cap.stylePresets', 'agents.cap.preview']
  },
  {
    icon: Mic,
    key: 'agents.4',
    accent: 'emerald',
    capabilities: ['agents.cap.lipSync', 'agents.cap.emotion', 'agents.cap.multiLang', 'agents.cap.voiceClone']
  }
]

const colorMap = {
  cyan:    { ring: 'border-cyan-400/30', text: 'text-cyan-300', bg: 'bg-cyan-500/10' },
  violet:  { ring: 'border-violet-400/30', text: 'text-violet-300', bg: 'bg-violet-500/10' },
  pink:    { ring: 'border-pink-400/30', text: 'text-pink-300', bg: 'bg-pink-500/10' },
  emerald: { ring: 'border-emerald-400/30', text: 'text-emerald-300', bg: 'bg-emerald-500/10' }
}

const steps = [
  { key: 'agents.how.step1' },
  { key: 'agents.how.step2' },
  { key: 'agents.how.step3' }
]
</script>

<template>
  <section class="relative py-16 sm:py-20">
    <div class="container-x">
      <!-- hero -->
      <div class="mx-auto max-w-3xl text-center">
        <div class="section-title-eyebrow mx-auto">{{ t('agents.view.eyebrow') }}</div>
        <h1 class="mt-4 text-4xl sm:text-6xl font-bold tracking-tight text-balance">
          {{ t('agents.view.title1') }} <span class="grad-text">{{ t('agents.view.title2') }}</span>
        </h1>
        <p class="mt-5 text-ink-400 text-base sm:text-lg">
          {{ t('agents.view.desc') }}
        </p>
      </div>

      <!-- 4 detailed agents -->
      <div class="mt-16 grid gap-6 lg:grid-cols-2">
        <article
          v-for="a in agents"
          :key="a.key"
          class="grad-border p-7 hover:shadow-glow-brand transition-all duration-300"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="inline-flex h-12 w-12 items-center justify-center rounded-xl border"
                 :class="[colorMap[a.accent].ring, colorMap[a.accent].bg, colorMap[a.accent].text]">
              <component :is="a.icon" class="h-6 w-6" />
            </div>
            <span class="text-[10px] font-mono text-ink-500 uppercase">{{ a.key }}</span>
          </div>

          <h2 class="mt-5 text-xl sm:text-2xl font-semibold text-white">{{ t(a.key + '.title') }}</h2>
          <p class="mt-3 text-sm sm:text-base text-ink-300 leading-relaxed">{{ t(a.key + '.desc') }}</p>

          <div class="mt-5 border-t border-white/5 pt-5">
            <div class="text-[11px] uppercase tracking-wider text-ink-500 mb-3">{{ t('agents.capabilities') }}</div>
            <ul class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <li v-for="c in a.capabilities" :key="c" class="flex items-start gap-2 text-sm text-ink-200">
                <CheckCircle2 class="h-4 w-4 mt-0.5 shrink-0" :class="colorMap[a.accent].text" />
                <span>{{ t(c) }}</span>
              </li>
            </ul>
          </div>

          <router-link to="/try"
                      class="mt-6 inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
                      :class="colorMap[a.accent].text + ' hover:text-white'">
            {{ t('agents.tryThisOne') }}
            <ArrowRight class="h-3.5 w-3.5" />
          </router-link>
        </article>
      </div>

      <!-- How it works -->
      <div class="mt-24 sm:mt-32">
        <div class="mx-auto max-w-3xl text-center">
          <div class="section-title-eyebrow mx-auto">{{ t('agents.how.eyebrow') }}</div>
          <h2 class="mt-4 text-3xl sm:text-5xl font-bold tracking-tight text-balance">
            {{ t('agents.how.title1') }} <span class="grad-text">{{ t('agents.how.title2') }}</span>
          </h2>
        </div>

        <div class="mt-12 grid gap-6 md:grid-cols-3">
          <div v-for="(s, i) in steps" :key="s.key" class="grad-border p-6">
            <div class="text-4xl font-bold grad-text">0{{ i + 1 }}</div>
            <h3 class="mt-3 text-lg font-semibold text-white">{{ t(s.key + '.title') }}</h3>
            <p class="mt-2 text-sm text-ink-400 leading-relaxed">{{ t(s.key + '.desc') }}</p>
          </div>
        </div>
      </div>

      <!-- CTA -->
      <div class="mt-24 sm:mt-32 relative overflow-hidden rounded-3xl border border-white/10 bg-ink-900/60 px-6 py-14 sm:px-12 sm:py-16">
        <div class="pointer-events-none absolute inset-0">
          <div class="absolute -top-32 left-1/2 h-72 w-[820px] -translate-x-1/2 rounded-full bg-brand-gradient-soft blur-3xl"></div>
        </div>
        <div class="relative mx-auto max-w-2xl text-center">
          <div class="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient text-white">
            <Wand2 class="h-6 w-6" />
          </div>
          <h2 class="mt-5 text-3xl sm:text-4xl font-bold tracking-tight">
            {{ t('agents.view.ctaTitle') }}
          </h2>
          <p class="mt-3 text-ink-300 text-base">{{ t('agents.view.ctaDesc') }}</p>
          <div class="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            <router-link to="/try" class="btn btn-primary px-7 py-3 text-sm">
              <Sparkles class="h-4 w-4" /> {{ t('agents.view.ctaPrimary') }}
              <ArrowRight class="h-4 w-4" />
            </router-link>
            <router-link to="/pricing" class="btn btn-ghost px-7 py-3 text-sm">
              <Layers class="h-4 w-4" /> {{ t('agents.view.ctaSecondary') }}
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>