<script setup>
import { Check, Sparkles, ArrowRight } from '@lucide/vue'

const tiers = [
  {
    name: 'Free',
    price: '$0',
    cadence: 'forever',
    desc: 'Try every model with daily credits. Perfect for kicking the tires.',
    cta: 'Start free',
    href: '/try',
    highlight: false,
    features: [
      'Daily free credits across all models',
      'Access to 100+ flagship models',
      'Standard generation queue',
      'Community gallery'
    ]
  },
  {
    name: 'Pro',
    price: '$19',
    cadence: 'per month',
    desc: 'For creators shipping real work. Priority queue, more credits, faster.',
    cta: 'Go Pro',
    href: '/try',
    highlight: true,
    features: [
      '20× more daily credits than Free',
      'Priority generation queue',
      'Commercial usage license',
      'Higher resolution outputs',
      'Email support'
    ]
  },
  {
    name: 'Team',
    price: '$79',
    cadence: 'per seat / month',
    desc: 'Shared workspace, unified billing, API access. Built for small teams.',
    cta: 'Talk to us',
    href: '#',
    highlight: false,
    features: [
      'Everything in Pro',
      'Shared team workspace',
      'Unified billing & invoices',
      'OpenAI-compatible API access',
      'Dedicated channel support'
    ]
  }
]
</script>

<template>
  <section class="relative py-20 sm:py-24">
    <div class="container-x">
      <div class="mx-auto max-w-3xl text-center">
        <div class="section-title-eyebrow mx-auto">Pricing</div>
        <h1 class="mt-4 text-4xl sm:text-6xl font-bold tracking-tight text-balance">
          Simple plans. <span class="grad-text">Honest pricing.</span>
        </h1>
        <p class="mt-5 text-ink-400 text-base sm:text-lg">
          One subscription, every model. Cancel anytime. No per-model juggling.
        </p>
      </div>

      <div class="mt-14 grid gap-5 lg:grid-cols-3">
        <div
          v-for="t in tiers"
          :key="t.name"
          class="relative rounded-2xl p-7 transition-all"
          :class="t.highlight
            ? 'grad-border shadow-glow-brand lg:scale-[1.03]'
            : 'border border-white/10 bg-white/[0.03]'"
        >
          <div v-if="t.highlight" class="absolute -top-3 left-1/2 -translate-x-1/2">
            <span class="chip chip-brand"><Sparkles class="h-3 w-3" /> Most popular</span>
          </div>

          <div class="flex items-baseline justify-between">
            <h3 class="text-lg font-semibold text-white">{{ t.name }}</h3>
          </div>
          <div class="mt-5 flex items-baseline gap-2">
            <span class="text-5xl font-bold tracking-tight" :class="t.highlight ? 'grad-text' : 'text-white'">{{ t.price }}</span>
            <span class="text-sm text-ink-400">{{ t.cadence }}</span>
          </div>
          <p class="mt-3 text-sm text-ink-400 leading-relaxed">{{ t.desc }}</p>

          <ul class="mt-6 space-y-2.5 text-sm">
            <li v-for="f in t.features" :key="f" class="flex items-start gap-2.5 text-ink-200">
              <Check class="h-4 w-4 mt-0.5 text-cyan-300 shrink-0" /> <span>{{ f }}</span>
            </li>
          </ul>

          <a
            :href="t.href"
            class="btn mt-7 w-full"
            :class="t.highlight ? 'btn-primary' : 'btn-ghost'"
          >
            {{ t.cta }}
            <ArrowRight class="h-4 w-4" />
          </a>
        </div>
      </div>

      <p class="mt-10 text-center text-sm text-ink-500">
        Need API access, custom limits, or an enterprise contract? <a href="#" class="text-ink-300 hover:text-white underline-offset-4 hover:underline">Talk to us</a>.
      </p>
    </div>
  </section>
</template>