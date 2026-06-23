<script setup>
import { Sparkles, ArrowRight, Headphones } from '@lucide/vue'
</script>

<template>
  <section class="relative py-24">
    <div class="container-x">
      <div class="relative overflow-hidden rounded-3xl border border-white/10 bg-ink-900/60 px-6 py-16 sm:px-12 sm:py-20">
        <!-- glow -->
        <div class="pointer-events-none absolute inset-0">
          <div class="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl"></div>
          <div class="absolute -bottom-32 -right-24 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl"></div>
          <div class="absolute inset-0 bg-hero-grid [background-size:48px_48px] opacity-30 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,black,transparent_75%)]"></div>
        </div>

        <div class="relative mx-auto max-w-3xl text-center">
          <div class="section-title-eyebrow mx-auto">
            <Sparkles class="h-3 w-3" /> Start now
          </div>
          <h2 class="mt-5 text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-balance">
            Your <span class="grad-text">AI creation</span> journey starts here.
          </h2>
          <p class="mt-5 text-ink-300 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            No app switching. No juggling subscriptions. Just open Package and start making.
          </p>

          <div class="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <router-link to="/try" class="btn btn-primary px-7 py-3 text-sm">
              <Sparkles class="h-4 w-4" /> Start free
              <ArrowRight class="h-4 w-4" />
            </router-link>
            <a href="#" class="btn btn-ghost px-7 py-3 text-sm">
              <Headphones class="h-4 w-4" /> Talk to support
            </a>
          </div>
          <p class="mt-6 text-xs text-ink-500">No credit card required · Free tier every day</p>
        </div>
      </div>
    </div>
  </section>
</template>