<script setup>
import { BookOpen, Film, Palette, Mic, ArrowUpRight } from '@lucide/vue'

const cards = [
  {
    icon: BookOpen,
    title: 'Generate comics in one click',
    desc: 'Drop in a script or reference images — Package agents split shots, draw characters, dub voices, and stitch the final video. Whole pipeline, one button.',
    cta: 'Try it now'
  },
  {
    icon: Film,
    title: 'Smart long-form video',
    desc: 'Multiple reference frames plus a written outline. Pin down what every shot contains and how long it runs — get a coherent, pro-grade video out the other side.',
    cta: 'Try it now'
  },
  {
    icon: Palette,
    title: 'One-click style switching',
    desc: 'Cyberpunk, ink-wash, 3D animation, cinematic realism — keep switching the visual language of your project without losing character consistency.',
    cta: 'Try it now'
  },
  {
    icon: Mic,
    title: 'Auto-matched screen dubbing',
    desc: 'Lip-sync and emotion in 30+ languages. Drop in a script, pick a voice, ship a finished piece.',
    cta: 'Try it now'
  }
]
</script>

<template>
  <section id="agents" class="relative py-20 sm:py-28">
    <div class="container-x">
      <div class="text-center mb-14">
        <div class="section-title-eyebrow mx-auto">AI Agents</div>
        <h2 class="mt-4 text-3xl sm:text-5xl font-bold tracking-tight text-balance">
          Not just a tool.
          <span class="block grad-text">Your creative partner.</span>
        </h2>
        <p class="mt-5 mx-auto max-w-2xl text-ink-400 text-base sm:text-lg leading-relaxed">
          From the first line of copy to the final rendered video — Package agents run the whole pipeline, multiplying your speed by 10×.
        </p>
      </div>

      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <article
          v-for="(c, i) in cards"
          :key="c.title"
          class="grad-border group p-6 hover:shadow-glow-brand transition-all duration-300"
          :style="{ animationDelay: `${i * 80}ms` }"
        >
          <div class="flex items-center justify-between">
            <div class="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-cyan-300 group-hover:text-white group-hover:bg-brand-gradient transition-all">
              <component :is="c.icon" class="h-5 w-5" />
            </div>
            <span class="text-[10px] font-mono text-ink-500">0{{ i + 1 }}</span>
          </div>
          <h3 class="mt-5 text-lg font-semibold text-white">{{ c.title }}</h3>
          <p class="mt-2 text-sm text-ink-400 leading-relaxed">{{ c.desc }}</p>
          <router-link to="/try" class="mt-5 inline-flex items-center gap-1 text-sm font-medium text-cyan-300 hover:text-white transition-colors">
            {{ c.cta }}
            <ArrowUpRight class="h-3.5 w-3.5" />
          </router-link>
        </article>
      </div>
    </div>
  </section>
</template>