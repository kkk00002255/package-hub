<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, Sparkles, ArrowRight } from '@lucide/vue'

const { t } = useI18n()

// Static tier meta: name (i18n key), price (i18n key), cadence (i18n key), desc (i18n key), cta (i18n key), features (i18n keys), href, highlight, badge (i18n key, optional)
const tierDefs = [
  { id: 'free',       featureKeys: ['pricing.free.f1', 'pricing.free.f2', 'pricing.free.f3', 'pricing.free.f4'], href: '/try', highlight: false },
  { id: 'pro',        featureKeys: ['pricing.pro.f1',  'pricing.pro.f2',  'pricing.pro.f3',  'pricing.pro.f4',  'pricing.pro.f5'],  href: '/try', highlight: true,  badgeKey: 'pricing.pro.badge' },
  { id: 'team',       featureKeys: ['pricing.team.f1', 'pricing.team.f2', 'pricing.team.f3', 'pricing.team.f4', 'pricing.team.f5'], href: '#',    highlight: false },
  { id: 'enterprise', featureKeys: ['pricing.enterprise.f1', 'pricing.enterprise.f2', 'pricing.enterprise.f3', 'pricing.enterprise.f4', 'pricing.enterprise.f5'], href: 'mailto:sales@package.ai?subject=Enterprise%20inquiry', highlight: false }
]

const tiers = computed(() =>
  tierDefs.map(d => ({
    name: t(`pricing.${d.id}.name`),
    price: t(`pricing.${d.id}.price`),
    cadence: t(`pricing.${d.id}.cadence`),
    desc: t(`pricing.${d.id}.desc`),
    cta: t(`pricing.${d.id}.cta`),
    features: d.featureKeys.map(k => t(k)),
    href: d.href,
    highlight: d.highlight,
    badge: d.badgeKey ? t(d.badgeKey) : null
  }))
)
</script>

<template>
  <section class="relative py-20 sm:py-24">
    <div class="container-x">
      <div class="mx-auto max-w-3xl text-center">
        <div class="section-title-eyebrow mx-auto">{{ t('pricing.eyebrow') }}</div>
        <h1 class="mt-4 text-4xl sm:text-6xl font-bold tracking-tight text-balance">
          {{ t('pricing.title1') }} <span class="grad-text">{{ t('pricing.title2') }}</span>
        </h1>
        <p class="mt-5 text-ink-400 text-base sm:text-lg">
          {{ t('pricing.desc') }}
        </p>
      </div>

      <div class="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="tier in tiers"
          :key="tier.name"
          class="relative rounded-2xl p-7 transition-all"
          :class="tier.highlight
            ? 'grad-border shadow-glow-brand lg:scale-[1.03]'
            : 'border border-white/10 bg-white/[0.03]'"
        >
          <div v-if="tier.badge" class="absolute -top-3 left-1/2 -translate-x-1/2">
            <span class="chip chip-brand"><Sparkles class="h-3 w-3" /> {{ tier.badge }}</span>
          </div>

          <div class="flex items-baseline justify-between">
            <h3 class="text-lg font-semibold text-white">{{ tier.name }}</h3>
          </div>
          <div class="mt-5 flex items-baseline gap-2">
            <span class="text-5xl font-bold tracking-tight" :class="tier.highlight ? 'grad-text' : 'text-white'">{{ tier.price }}</span>
            <span class="text-sm text-ink-400">{{ tier.cadence }}</span>
          </div>
          <p class="mt-3 text-sm text-ink-400 leading-relaxed">{{ tier.desc }}</p>

          <ul class="mt-6 space-y-2.5 text-sm">
            <li v-for="f in tier.features" :key="f" class="flex items-start gap-2.5 text-ink-200">
              <Check class="h-4 w-4 mt-0.5 text-cyan-300 shrink-0" /> <span>{{ f }}</span>
            </li>
          </ul>

          <a
            :href="tier.href"
            class="btn mt-7 w-full"
            :class="tier.highlight ? 'btn-primary' : 'btn-ghost'"
          >
            {{ tier.cta }}
            <ArrowRight class="h-4 w-4" />
          </a>
        </div>
      </div>

      <p class="mt-10 text-center text-sm text-ink-500">
        {{ t('pricing.contact') }} <a href="#" class="text-ink-300 hover:text-white underline-offset-4 hover:underline">{{ t('pricing.contactCta') }}</a>.
      </p>
    </div>
  </section>
</template>