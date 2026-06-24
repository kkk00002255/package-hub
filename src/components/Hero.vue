<script setup>
import { useI18n } from 'vue-i18n'
import { Sparkles, Zap, ArrowRight, Play } from '@lucide/vue'

const { t } = useI18n()
</script>

<template>
  <section class="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28">
    <!-- decorative grid + glow -->
    <div class="pointer-events-none absolute inset-0 bg-hero-grid [background-size:48px_48px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_30%,black,transparent_75%)]" aria-hidden="true" />
    <div class="pointer-events-none absolute -top-24 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-brand-gradient-soft blur-3xl" aria-hidden="true" />

    <div class="container-x relative">
      <div class="mx-auto flex max-w-3xl flex-col items-center text-center">
        <div class="chip chip-brand mb-5 animate-fade-in">
          <Sparkles class="h-3.5 w-3.5" />
          {{ t('hero.chip') }}
        </div>

        <h1 class="text-balance text-4xl sm:text-6xl md:text-7xl font-bold leading-[1.05] tracking-tight">
          {{ t('hero.title1') }}
          <span class="block mt-1">
            <span class="grad-text">{{ t('hero.title2') }}</span>
          </span>
        </h1>

        <p class="mt-6 max-w-2xl text-balance text-base sm:text-lg text-ink-300 leading-relaxed">
          {{ t('hero.desc') }}
        </p>

        <div class="mt-9 flex flex-col sm:flex-row items-center gap-3">
          <router-link to="/try" class="btn btn-primary px-6 py-3 text-sm">
            <Zap class="h-4 w-4" /> {{ t('hero.ctaPrimary') }}
            <ArrowRight class="h-4 w-4" />
          </router-link>
          <a href="#inspiration" class="btn btn-ghost px-6 py-3 text-sm">
            <Play class="h-4 w-4" /> {{ t('hero.ctaSecondary') }}
          </a>
        </div>

        <div class="mt-14 grid grid-cols-3 gap-6 sm:gap-10 w-full max-w-xl">
          <div class="text-center">
            <div class="text-3xl sm:text-4xl font-bold tracking-tight"><span class="grad-text">100+</span></div>
            <div class="mt-1 text-[11px] sm:text-xs uppercase tracking-wider text-ink-400">{{ t('hero.stat.models') }}</div>
          </div>
          <div class="text-center">
            <div class="text-3xl sm:text-4xl font-bold tracking-tight"><span class="grad-text">10K+</span></div>
            <div class="mt-1 text-[11px] sm:text-xs uppercase tracking-wider text-ink-400">{{ t('hero.stat.creators') }}</div>
          </div>
          <div class="text-center">
            <div class="text-3xl sm:text-4xl font-bold tracking-tight"><span class="grad-text">∞</span></div>
            <div class="mt-1 text-[11px] sm:text-xs uppercase tracking-wider text-ink-400">{{ t('hero.stat.possibilities') }}</div>
          </div>
        </div>
      </div>

      <!-- floating model chips preview -->
      <div class="relative mt-16 sm:mt-20 mx-auto max-w-5xl">
        <div class="grad-border p-5 sm:p-7 shadow-card">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2 text-xs text-ink-400">
              <span class="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]"></span>
              {{ t('hero.preview.label') }}
            </div>
            <router-link to="/models" class="text-xs text-ink-300 hover:text-white inline-flex items-center gap-1">
              {{ t('hero.preview.browse') }} <ArrowRight class="h-3.5 w-3.5" />
            </router-link>
          </div>
          <div class="flex flex-wrap gap-2">
            <span class="model-pill"><span class="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>GPT-5.5</span>
            <span class="model-pill"><span class="h-1.5 w-1.5 rounded-full bg-violet-400"></span>Claude Opus 4.8</span>
            <span class="model-pill"><span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>Gemini 3 Pro</span>
            <span class="model-pill"><span class="h-1.5 w-1.5 rounded-full bg-amber-400"></span>Sora 2</span>
            <span class="model-pill"><span class="h-1.5 w-1.5 rounded-full bg-rose-400"></span>Veo 3.1</span>
            <span class="model-pill"><span class="h-1.5 w-1.5 rounded-full bg-fuchsia-400"></span>Kling 2.6 Pro</span>
            <span class="model-pill"><span class="h-1.5 w-1.5 rounded-full bg-orange-400"></span>Vidu Q3 Turbo</span>
            <span class="model-pill"><span class="h-1.5 w-1.5 rounded-full bg-pink-400"></span>Banana 2 Official</span>
            <span class="model-pill"><span class="h-1.5 w-1.5 rounded-full bg-cyan-300"></span>GPT Image 2</span>
            <span class="model-pill"><span class="h-1.5 w-1.5 rounded-full bg-violet-300"></span>Wanxiang 2.7</span>
            <span class="model-pill"><span class="h-1.5 w-1.5 rounded-full bg-rose-300"></span>DeepSeek V4 Pro</span>
            <span class="model-pill"><span class="h-1.5 w-1.5 rounded-full bg-emerald-300"></span>Qwen 3.7 Max</span>
            <span class="model-pill"><span class="h-1.5 w-1.5 rounded-full bg-amber-300"></span>Suno 4.5</span>
            <span class="model-pill"><span class="h-1.5 w-1.5 rounded-full bg-indigo-300"></span>Doubao TTS 2.0</span>
            <span class="model-pill"><span class="h-1.5 w-1.5 rounded-full bg-slate-300"></span>GLM 5.2</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>