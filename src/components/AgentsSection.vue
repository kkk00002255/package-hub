<script setup>
import { useI18n } from 'vue-i18n'
import { BookOpen, Film, Palette, Mic, ArrowUpRight } from '@lucide/vue'

const { t } = useI18n()

const cards = [
  { icon: BookOpen, key: 'agents.1' },
  { icon: Film,     key: 'agents.2' },
  { icon: Palette,  key: 'agents.3' },
  { icon: Mic,      key: 'agents.4' }
]
</script>

<template>
  <section id="agents" class="relative py-20 sm:py-28">
    <div class="container-x">
      <div class="text-center mb-14">
        <div class="section-title-eyebrow mx-auto">{{ t('agents.eyebrow') }}</div>
        <h2 class="mt-4 text-3xl sm:text-5xl font-bold tracking-tight text-balance">
          {{ t('agents.title1') }}
          <span class="block grad-text">{{ t('agents.title2') }}</span>
        </h2>
        <p class="mt-5 mx-auto max-w-2xl text-ink-400 text-base sm:text-lg leading-relaxed">
          {{ t('agents.desc') }}
        </p>
      </div>

      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <article
          v-for="(c, i) in cards"
          :key="c.key"
          class="grad-border group p-6 hover:shadow-glow-brand transition-all duration-300"
          :style="{ animationDelay: `${i * 80}ms` }"
        >
          <div class="flex items-center justify-between">
            <div class="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-cyan-300 group-hover:text-white group-hover:bg-brand-gradient transition-all">
              <component :is="c.icon" class="h-5 w-5" />
            </div>
            <span class="text-[10px] font-mono text-ink-500">0{{ i + 1 }}</span>
          </div>
          <h3 class="mt-5 text-lg font-semibold text-white">{{ t(c.key + '.title') }}</h3>
          <p class="mt-2 text-sm text-ink-400 leading-relaxed">{{ t(c.key + '.desc') }}</p>
          <router-link to="/try" class="mt-5 inline-flex items-center gap-1 text-sm font-medium text-cyan-300 hover:text-white transition-colors">
            {{ t('agents.cta') }}
            <ArrowUpRight class="h-3.5 w-3.5" />
          </router-link>
        </article>
      </div>
    </div>
  </section>
</template>