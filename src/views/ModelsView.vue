<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import models from '../data/models.json'
import ModelCard from '../components/ModelCard.vue'
import { Search, Filter } from '@lucide/vue'

const { t } = useI18n()

const search = ref('')
const activeCat = ref('all')

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return models.models.filter(m => {
    const okCat = activeCat.value === 'all' || m.category === activeCat.value
    const okQ = !q || m.name.toLowerCase().includes(q) || m.vendor.toLowerCase().includes(q) || m.tagline.toLowerCase().includes(q)
    return okCat && okQ
  })
})

const countByCat = (id) => id === 'all' ? models.models.length : models.models.filter(m => m.category === id).length
</script>

<template>
  <section class="relative py-16 sm:py-20">
    <div class="container-x">
      <div class="mx-auto max-w-3xl text-center">
        <div class="section-title-eyebrow mx-auto">{{ t('models.eyebrow') }}</div>
        <h1 class="mt-4 text-4xl sm:text-6xl font-bold tracking-tight text-balance">
          {{ t('models.title1') }} <span class="grad-text">{{ t('models.title2') }}</span>
        </h1>
        <p class="mt-5 text-ink-400 text-base sm:text-lg">
          {{ t('models.desc', { n: models.models.length }) }}
        </p>
      </div>

      <div class="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div class="relative flex-1">
          <Search class="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-500" />
          <input
            v-model="search"
            type="search"
            :placeholder="t('models.search.placeholder')"
            class="w-full rounded-full bg-white/5 border border-white/10 pl-11 pr-4 py-3 text-sm placeholder-ink-500 focus:outline-none focus:border-brand-500/50 focus:bg-white/[0.07]"
          />
        </div>
        <div class="flex items-center gap-1.5 overflow-x-auto mask-fade-r -mx-1 px-1">
          <button
            @click="activeCat = 'all'"
            :class="['shrink-0 rounded-full px-3.5 py-1.5 text-xs border transition',
                     activeCat === 'all'
                       ? 'bg-white text-ink-950 border-white'
                       : 'border-white/10 bg-white/5 text-ink-300 hover:bg-white/10']"
          >
            {{ t('models.filter.all') }} <span class="text-ink-500">· {{ countByCat('all') }}</span>
          </button>
          <button
            v-for="c in models.categories"
            :key="c.id"
            @click="activeCat = c.id"
            :class="['shrink-0 rounded-full px-3.5 py-1.5 text-xs border transition',
                     activeCat === c.id
                       ? 'bg-white text-ink-950 border-white'
                       : 'border-white/10 bg-white/5 text-ink-300 hover:bg-white/10']"
          >
            {{ c.label }} <span class="text-ink-500">· {{ countByCat(c.id) }}</span>
          </button>
        </div>
      </div>

      <div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <ModelCard v-for="m in filtered" :key="m.id" :model="m" />
      </div>

      <div v-if="!filtered.length" class="mt-16 text-center text-ink-500">
        {{ t('models.empty') }}
      </div>
    </div>
  </section>
</template>