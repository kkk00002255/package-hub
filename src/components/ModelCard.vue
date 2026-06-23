<script setup>
import { MessageSquare, Image as ImageIcon, Film, Music, Mic, Sparkles } from '@lucide/vue'

const props = defineProps({
  model: { type: Object, required: true }
})

const iconFor = (cat) => ({
  chat: MessageSquare, image: ImageIcon, video: Film, music: Music, voice: Mic, agent: Sparkles
})[cat] || Sparkles

const tierClass = (tier) => ({
  flagship: 'bg-gradient-to-r from-cyan-500/15 to-violet-500/15 text-cyan-200 border-cyan-400/30',
  pro: 'bg-white/5 text-ink-200 border-white/10',
  fast: 'bg-amber-500/10 text-amber-200 border-amber-400/20',
  lite: 'bg-emerald-500/10 text-emerald-200 border-emerald-400/20'
})[tier] || 'bg-white/5 text-ink-200 border-white/10'
</script>

<template>
  <article class="group relative rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-white/20 hover:bg-white/[0.05] transition-all">
    <div class="flex items-start justify-between">
      <div class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-ink-200 group-hover:text-white group-hover:border-brand-500/40 transition">
        <component :is="iconFor(model.category)" class="h-4 w-4" />
      </div>
      <span class="text-[10px] uppercase tracking-wider rounded-full border px-2 py-0.5" :class="tierClass(model.tier)">{{ model.tier }}</span>
    </div>
    <h3 class="mt-4 text-base font-semibold text-white">{{ model.name }}</h3>
    <p class="mt-1 text-xs text-ink-500">{{ model.vendor }}</p>
    <p class="mt-3 text-sm text-ink-400 leading-relaxed line-clamp-2">{{ model.tagline }}</p>
    <router-link
      :to="`/try/${model.id}`"
      class="mt-4 inline-flex items-center gap-1 text-xs font-medium text-ink-300 hover:text-white"
    >
      Open in workspace →
    </router-link>
  </article>
</template>