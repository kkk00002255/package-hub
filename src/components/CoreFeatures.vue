<script setup>
import { MessageSquare, Image as ImageIcon, Film, Mic } from '@lucide/vue'

const items = [
  { icon: MessageSquare, title: 'Intelligent conversation', desc: 'Talk to every flagship LLM side by side. Compare answers, switch mid-thread, route by task.', color: 'cyan' },
  { icon: ImageIcon, title: 'Image creation', desc: 'Generate, edit and remix with the world’s top diffusion models. Brand-safe, photoreal, painterly — at will.', color: 'violet' },
  { icon: Film, title: 'Video generation', desc: 'Text to cinematic, image to motion, frame-locked transitions, sound-synced — all under one roof.', color: 'pink' },
  { icon: Mic, title: 'Speech synthesis', desc: 'Lifelike TTS in 30+ languages with voice cloning, emotion control and instant iteration.', color: 'emerald' }
]

const colorMap = {
  cyan:    'text-cyan-300 group-hover:bg-cyan-500/15 group-hover:text-cyan-200',
  violet:  'text-violet-300 group-hover:bg-violet-500/15 group-hover:text-violet-200',
  pink:    'text-pink-300 group-hover:bg-pink-500/15 group-hover:text-pink-200',
  emerald: 'text-emerald-300 group-hover:bg-emerald-500/15 group-hover:text-emerald-200'
}
</script>

<template>
  <section class="relative py-20 sm:py-24">
    <div class="container-x">
      <div class="text-center mb-14">
        <div class="section-title-eyebrow mx-auto">Core Capabilities</div>
        <h2 class="mt-4 text-3xl sm:text-5xl font-bold tracking-tight text-balance">
          Four core capabilities.
          <span class="block grad-text">One platform.</span>
        </h2>
      </div>

      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <article
          v-for="it in items"
          :key="it.title"
          class="group relative rounded-2xl border border-white/10 bg-white/[0.03] p-6 hover:border-white/20 hover:bg-white/[0.05] transition-all"
        >
          <div class="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 border border-white/10 transition-all"
               :class="colorMap[it.color]">
            <component :is="it.icon" class="h-5 w-5" />
          </div>
          <h3 class="mt-5 text-lg font-semibold text-white capitalize">{{ it.title }}</h3>
          <p class="mt-2 text-sm text-ink-400 leading-relaxed">{{ it.desc }}</p>
        </article>
      </div>
    </div>
  </section>
</template>