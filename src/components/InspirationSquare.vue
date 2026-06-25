<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import inspiration from '../data/inspiration.json'
import { Play, Image as ImageIcon, Music, Mic, Sparkles, ArrowRight, Zap, MessageSquare } from '@lucide/vue'

const { t } = useI18n()
const router = useRouter()

const categories = inspiration.categories
const activeCat = ref('all')

const filtered = computed(() => {
  if (activeCat.value === 'all') return inspiration.tiles
  return inspiration.tiles.filter(tile => tile.kind === activeCat.value)
})

const tiles = computed(() => filtered.value)

// 跳转到 /try 并预填 prompt
function goTry(tile) {
  router.push({
    path: '/try',
    query: tile.kind === 'chat' ? { prompt: tile.prompt } : { model: pickModel(tile.kind), prompt: tile.prompt }
  })
}

function pickModel(kind) {
  // 按 kind 选第一个匹配 model
  if (kind === 'image') return 'doubao-seed-2.1-pro'
  if (kind === 'video') return 'wanxiang-vid'
  if (kind === 'voice' || kind === 'music') return 'doubao-tts-2'
  return null
}
</script>

<template>
  <section id="inspiration" class="relative py-20 sm:py-28">
    <div class="container-x">
      <div class="text-center mb-10">
        <div class="section-title-eyebrow mx-auto">{{ t('insp.eyebrow') }}</div>
        <h2 class="mt-4 text-3xl sm:text-5xl font-bold tracking-tight">
          <span class="grad-text">{{ t('insp.title') }}</span>
        </h2>
        <p class="mt-4 text-ink-400 text-base sm:text-lg max-w-2xl mx-auto">
          {{ t('insp.desc') }}
        </p>
      </div>

      <!-- 类目 tab 切换 -->
      <div class="flex items-center justify-center gap-1.5 mb-8 flex-wrap px-2">
        <button
          v-for="c in categories"
          :key="c.id"
          @click="activeCat = c.id"
          :class="[
            'px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-1.5',
            activeCat === c.id
              ? 'bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-md'
              : 'bg-white/5 text-ink-300 hover:bg-white/10 border border-white/10'
          ]"
        >
          <component :is="c.icon === 'Sparkles' ? Sparkles : c.icon === 'Image' ? ImageIcon : c.icon === 'Film' ? Play : c.icon === 'Music' ? Music : Mic" class="h-3.5 w-3.5" />
          {{ c.label }}
          <span v-if="c.id !== 'all'" class="text-[10px] opacity-70">{{ inspiration.tiles.filter(t => t.kind === c.id).length }}</span>
        </button>
      </div>

      <!-- tile 网格 -->
      <div :key="activeCat" class="columns-2 sm:columns-3 lg:columns-4 gap-4 [column-fill:_balance]">
        <div
          v-for="(tile, i) in tiles"
          :key="activeCat + '-' + i"
          @click="goTry(tile)"
          class="tile mb-4 break-inside-avoid group cursor-pointer relative overflow-hidden rounded-2xl"
          :style="{ aspectRatio: i % 5 === 0 ? '3/4' : i % 4 === 0 ? '4/5' : i % 3 === 0 ? '1/1' : '4/3' }"
        >
          <!-- 真实图（picsum 兜底 / gradient 渐变） -->
          <div class="absolute inset-0 bg-gradient-to-br transition-transform duration-500 group-hover:scale-110" :class="tile.gradient"></div>
          <div class="absolute inset-0 opacity-[0.06] mix-blend-overlay pointer-events-none" style="background-image:radial-gradient(circle at 1px 1px, white 1px, transparent 0); background-size: 6px 6px;"></div>
          <!-- 装饰 emoji 浮标（让 demo 更生动） -->
          <div class="absolute inset-0 flex items-center justify-center text-5xl sm:text-6xl opacity-30 group-hover:opacity-50 transition-opacity">
            {{ tile.kind === 'image' ? '🎨' : tile.kind === 'video' ? '🎬' : tile.kind === 'music' ? '🎵' : tile.kind === 'voice' ? '🎙' : '✨' }}
          </div>
          <!-- 渐变叠加（让图更有质感） -->
          <div class="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none"></div>
          <!-- subtle noise -->
          <div class="absolute inset-0 opacity-[0.06] mix-blend-overlay pointer-events-none" style="background-image:radial-gradient(circle at 1px 1px, white 1px, transparent 0); background-size: 6px 6px;"></div>

          <!-- kind chip -->
          <div class="absolute top-3 left-3 z-10 chip !text-[10px] !py-0.5 !px-2 bg-black/40 border-white/10 backdrop-blur flex items-center gap-1">
            <component :is="tile.kind === 'video' ? Play : tile.kind === 'music' ? Music : tile.kind === 'voice' ? Mic : ImageIcon" class="h-3 w-3" />
            {{ tile.kind }}
          </div>

          <!-- play icon for video -->
          <div v-if="tile.kind === 'video'" class="absolute inset-0 flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <div class="h-12 w-12 rounded-full bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center">
              <Play class="h-5 w-5 text-white fill-white ml-0.5" />
            </div>
          </div>

          <!-- music play icon -->
          <div v-else-if="tile.kind === 'music' || tile.kind === 'voice'" class="absolute inset-0 flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <div class="h-12 w-12 rounded-full bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center">
              <Zap class="h-5 w-5 text-white" />
            </div>
          </div>

          <!-- hover overlay: try now -->
          <div class="absolute inset-0 z-10 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-end p-3 opacity-0 group-hover:opacity-100">
            <span class="text-[10px] text-white font-medium bg-white/20 backdrop-blur border border-white/30 rounded-full px-2 py-1 flex items-center gap-1">
              Try now <ArrowRight class="h-3 w-3" />
            </span>
          </div>

          <!-- footer label -->
          <div class="absolute bottom-0 inset-x-0 z-20 p-3 bg-gradient-to-t from-black/60 to-transparent">
            <div class="text-[10px] uppercase tracking-wider text-white/70">{{ tile.model }}</div>
            <div class="text-sm font-medium text-white truncate">{{ tile.title }}</div>
          </div>
        </div>
      </div>

      <div class="mt-12 text-center flex items-center justify-center gap-3">
        <router-link to="/models" class="btn btn-ghost text-sm">
          {{ t('insp.more') }}
          <ArrowRight class="h-4 w-4" />
        </router-link>
        <router-link to="/try" class="btn btn-primary text-sm">
          <MessageSquare class="h-4 w-4" />
          {{ t('insp.startChat') }}
        </router-link>
      </div>
    </div>
  </section>
</template>
