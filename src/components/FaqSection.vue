<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronDown } from '@lucide/vue'

const { t } = useI18n()

// FAQ items as i18n keys (arrays in en.js / zh.js)
const items = [
  { qKey: 'faq.q1', aKey: 'faq.a1' },
  { qKey: 'faq.q2', aKey: 'faq.a2' },
  { qKey: 'faq.q3', aKey: 'faq.a3' },
  { qKey: 'faq.q4', aKey: 'faq.a4' },
  { qKey: 'faq.q5', aKey: 'faq.a5' },
  { qKey: 'faq.q6', aKey: 'faq.a6' }
]

const open = ref(0) // first one open by default
function toggle(i) { open.value = open.value === i ? -1 : i }
</script>

<template>
  <section id="faq" class="relative py-20 sm:py-24">
    <div class="container-x">
      <div class="mx-auto max-w-3xl text-center">
        <div class="section-title-eyebrow mx-auto">{{ t('faq.eyebrow') }}</div>
        <h2 class="mt-4 text-3xl sm:text-5xl font-bold tracking-tight text-balance">
          {{ t('faq.title1') }} <span class="grad-text">{{ t('faq.title2') }}</span>
        </h2>
        <p class="mt-5 text-ink-400 text-base sm:text-lg">
          {{ t('faq.desc') }}
        </p>
      </div>

      <div class="mx-auto mt-12 max-w-3xl divide-y divide-white/5 rounded-2xl border border-white/10 bg-white/[0.02]">
        <div v-for="(it, i) in items" :key="it.qKey" class="group">
          <button
            @click="toggle(i)"
            class="w-full flex items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-white/[0.03]"
            :aria-expanded="open === i"
          >
            <span class="text-base font-medium text-white">{{ t(it.qKey) }}</span>
            <ChevronDown
              class="h-5 w-5 shrink-0 text-ink-400 transition-transform duration-300"
              :class="open === i ? 'rotate-180 text-cyan-300' : ''"
            />
          </button>
          <div
            class="grid transition-all duration-300 ease-out"
            :class="open === i ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'"
          >
            <div class="overflow-hidden">
              <p class="px-6 pb-5 text-sm leading-relaxed text-ink-300">{{ t(it.aKey) }}</p>
            </div>
          </div>
        </div>
      </div>

      <p class="mt-10 text-center text-sm text-ink-400">
        {{ t('faq.more') }}
        <a href="mailto:support@package.ai" class="text-cyan-300 hover:text-white underline-offset-4 hover:underline">support@package.ai</a>
      </p>
    </div>
  </section>
</template>