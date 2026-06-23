<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import inspiration from '../data/inspiration.json'
import { Play, Image as ImageIcon, Music, ArrowDown } from '@lucide/vue'

const { t } = useI18n()
const tiles = computed(() => inspiration.tiles)
</script>

<template>
  <section id="inspiration" class="relative py-20 sm:py-28">
    <div class="container-x">
      <div class="text-center mb-12">
        <div class="section-title-eyebrow mx-auto">{{ t('insp.eyebrow') }}</div>
        <h2 class="mt-4 text-3xl sm:text-5xl font-bold tracking-tight">
          <span class="grad-text">{{ t('insp.title') }}</span>
        </h2>
        <p class="mt-4 text-ink-400 text-base sm:text-lg">
          {{ t('insp.desc') }}
        </p>
      </div>

      <div class="columns-2 sm:columns-3 lg:columns-4 gap-4 [column-fill:_balance]">
        <div
          v-for="(t, i) in tiles"
          :key="i"
          class="tile mb-4 break-inside-avoid group cursor-pointer"
          :style="{ aspectRatio: i % 5 === 0 ? '3/4' : i % 4 === 0 ? '4/5' : i % 3 === 0 ? '1/1' : '4/3' }"
        >
          <!-- gradient placeholder stand-in for real media (we don't ship copyrighted assets) -->
          <div class="absolute inset-0 bg-gradient-to-br" :class="t.gradient"></div>

          <!-- subtle noise -->
          <div class="absolute inset-0 opacity-[0.08] mix-blend-overlay" style="background-image:radial-gradient(circle at 1px 1px, white 1px, transparent 0); background-size: 6px 6px;"></div>

          <!-- kind chip -->
          <div class="absolute top-3 left-3 z-10 chip !text-[10px] !py-0.5 !px-2 bg-black/40 border-white/10 backdrop-blur">
            <component :is="t.kind === 'video' ? Play : t.kind === 'music' ? Music : ImageIcon" class="h-3 w-3" />
            {{ t.kind }}
          </div>

          <!-- play icon for video -->
          <div v-if="t.kind === 'video'" class="absolute inset-0 flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <div class="h-12 w-12 rounded-full bg-white/15 backdrop-blur border border-white/30 flex items-center justify-center">
              <Play class="h-5 w-5 text-white fill-white" />
            </div>
          </div>

          <!-- footer label -->
          <div class="absolute bottom-0 inset-x-0 z-10 p-3">
            <div class="text-[10px] uppercase tracking-wider text-white/70">{{ t.model }}</div>
            <div class="text-sm font-medium text-white truncate">{{ t.title }}</div>
          </div>
        </div>
      </div>

      <div class="mt-12 text-center">
        <router-link to="/models" class="btn btn-ghost text-sm">
          {{ t('insp.more') }}
          <ArrowDown class="h-4 w-4" />
        </router-link>
      </div>
    </div>
  </section>
</template>