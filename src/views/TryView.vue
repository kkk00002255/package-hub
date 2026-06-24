<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import models from '../data/models.json'
import { Send, Sparkles, Loader2 } from '@lucide/vue'

const { t } = useI18n()
const route = useRoute()
const selectedId = ref(route.params.model || models.models[0].id)
const input = ref('')
const sending = ref(false)
const messages = ref([
  { role: 'system', key: 'try.system' }
])

const selected = computed(() => models.models.find(m => m.id === selectedId.value) || models.models[0])

// True if the selected model has a real upstream configured
// Status semantics:
//   'live'         -> real upstream, hits /api/chat
//   'demo'         -> uses default model (M3/M2.5) but UI shows the chosen card
//   'overseas'     -> placeholder; OpenRouter will return 403 in CN
//   'coming-soon'  -> not wired yet; friendly message
const liveStatus = computed(() => selected.value.status || (selected.value.upstream ? 'live' : 'demo'))
const isLive = computed(() => liveStatus.value === 'live')
const isDemo = computed(() => liveStatus.value === 'demo')
const isOverseas = computed(() => liveStatus.value === 'overseas')
const isComingSoon = computed(() => liveStatus.value === 'coming-soon')

const grouped = computed(() => {
  return models.categories.map(c => ({
    ...c,
    items: models.models.filter(m => m.category === c.id)
  })).filter(c => c.items.length)
})

async function send() {
  const text = input.value.trim()
  if (!text || sending.value) return

  messages.value.push({ role: 'user', text })
  input.value = ''
  sending.value = true

  const cat = selected.value.category

  // Coming soon or overseas: friendly message, no real call
  if (isComingSoon.value || isOverseas.value) {
    setTimeout(() => {
      const key = isOverseas.value ? 'try.overseas.reply' : 'try.comingsoon.reply'
      messages.value.push({
        role: 'assistant',
        text: t(key, { m: selected.value.name }),
        muted: true
      })
      sending.value = false
    }, 600)
    return
  }

  // Multimodal: image / video / voice / music
  if (cat === 'image') {
    return await sendImage(text)
  }
  if (cat === 'video') {
    return await sendVideo(text)
  }
  if (cat === 'voice' || cat === 'music') {
    return await sendAudio(text)
  }

  // Chat or Agent → /api/chat
  return await sendChat()
}

async function sendChat() {
  const history = messages.value
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({ role: m.role, content: m.text }))

  try {
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: history,
        model: selected.value.upstream
      })
    })

    let data
    try { data = await r.json() } catch { throw new Error('Invalid response from server') }

    if (!r.ok) {
      throw new Error(data.error || `HTTP ${r.status}`)
    }

    const out = data.result || data.reasoning_content || t('try.empty')
    messages.value.push({
      role: 'assistant',
      text: out + (data.upstream ? `  [via ${data.upstream}]` : '')
    })
  } catch (e) {
    messages.value.push({
      role: 'assistant',
      text: `⚠️ ${e.message || t('try.error')}`,
      error: true
    })
  } finally {
    sending.value = false
  }
}

async function sendImage(prompt) {
  try {
    const r = await fetch('/api/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        model: selected.value.upstream,
        size: '1024x1024',
        n: 1
      })
    })
    let data
    try { data = await r.json() } catch { throw new Error('Invalid response from server') }
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`)

    if (data.images && data.images.length > 0) {
      // 在聊天里插入图片
      const url = data.images[0].url || data.images[0]
      messages.value.push({
        role: 'assistant',
        text: `Generated image [${data.model}]:`,
        image: url
      })
    } else {
      messages.value.push({
        role: 'assistant',
        text: t('try.empty')
      })
    }
  } catch (e) {
    messages.value.push({
      role: 'assistant',
      text: `⚠️ ${e.message || t('try.error')}`,
      error: true
    })
  } finally {
    sending.value = false
  }
}

async function sendVideo(prompt) {
  try {
    messages.value.push({
      role: 'assistant',
      text: '🎬 Generating 20-second video (this may take 90-180 seconds)...',
      muted: true
    })

    // 自动获取最近一张生成的图片作为 I2V 输入
    let inputImage = null;
    for (let i = messages.value.length - 1; i >= 0; i--) {
      if (messages.value[i].image) {
        inputImage = messages.value[i].image;
        break;
      }
    }

    const r = await fetch('/api/video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        model: selected.value.upstream,
        image: inputImage, // I2V 需要输入图（从最近生成的图片自动获取）
        frames: 60,        // 5 秒视频（Vercel 60s 超时）
        fps: 12,
        duration: 5,       // 用户可改：5/10/15/20
      })
    })
    let data
    try { data = await r.json() } catch { throw new Error('Invalid response from server') }
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`)

    if (data.videos && data.videos.length > 0) {
      const url = data.videos[0].url || data.videos[0]
      messages.value.push({
        role: 'assistant',
        text: `Generated video [${data.model}]:`,
        video: url
      })
    } else {
      messages.value.push({
        role: 'assistant',
        text: t('try.empty')
      })
    }
  } catch (e) {
    messages.value.push({
      role: 'assistant',
      text: `⚠️ ${e.message || t('try.error')}`,
      error: true
    })
  } finally {
    sending.value = false
  }
}

async function sendAudio(text) {
  try {
    const r = await fetch('/api/audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model: selected.value.upstream
      })
    })
    let data
    try { data = await r.json() } catch { throw new Error('Invalid response from server') }
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`)

    if (data.audio) {
      messages.value.push({
        role: 'assistant',
        text: `Generated audio [${data.model}]:`,
        audio: data.audio
      })
    } else {
      messages.value.push({
        role: 'assistant',
        text: t('try.empty')
      })
    }
  } catch (e) {
    messages.value.push({
      role: 'assistant',
      text: `⚠️ ${e.message || t('try.error')}`,
      error: true
    })
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <section class="relative py-12 sm:py-16">
    <div class="container-x">
      <div class="grid gap-6 lg:grid-cols-[280px_1fr]">
        <!-- sidebar: model picker -->
        <aside class="lg:sticky lg:top-24 lg:self-start">
          <div class="grad-border p-4 max-h-[78vh] overflow-y-auto">
            <div class="text-[11px] uppercase tracking-wider text-ink-500 px-1 pb-2">{{ t('try.sidebar') }}</div>
            <div v-for="g in grouped" :key="g.id" class="mt-3">
              <div class="px-1 mb-1.5 text-xs font-medium text-ink-300">{{ g.label }}</div>
              <button
                v-for="m in g.items"
                :key="m.id"
                @click="selectedId = m.id"
                :class="[
                  'w-full text-left px-3 py-2 rounded-lg text-sm transition flex items-center justify-between gap-2',
                  selectedId === m.id
                    ? 'bg-brand-gradient-soft border border-brand-500/40 text-white'
                    : 'hover:bg-white/5 text-ink-300 border border-transparent'
                ]"
              >
                <span class="truncate">{{ m.name }}</span>
                <span v-if="m.tier === 'flagship'" class="text-[9px] uppercase text-cyan-300 shrink-0">{{ t('common.flagship') }}</span>
              </button>
            </div>
          </div>
        </aside>

        <!-- workspace -->
        <div class="grad-border flex flex-col min-h-[78vh]">
          <div class="flex items-center justify-between px-5 py-3 border-b border-white/5">
            <div>
              <div class="text-xs text-ink-500">{{ t('try.workspace') }}</div>
              <div class="text-sm font-semibold text-white">{{ selected.name }} <span class="text-ink-500 font-normal">· {{ selected.vendor }}</span></div>
            </div>
            <span class="chip" :class="isLive ? '' : 'opacity-60'">
              <span class="h-1.5 w-1.5 rounded-full"
                    :class="isLive ? 'bg-emerald-400' : isOverseas ? 'bg-sky-400' : isComingSoon ? 'bg-ink-500' : 'bg-amber-400'"></span>
              {{ isLive ? t('try.status.live') : isOverseas ? t('try.status.overseas') : isComingSoon ? t('try.status.coming-soon') : t('try.status.demo') }}
            </span>
          </div>

          <div class="flex-1 px-5 py-6 space-y-4 overflow-y-auto">
            <div
              v-for="(m, i) in messages"
              :key="i"
              :class="['flex', m.role === 'user' ? 'justify-end' : 'justify-start']"
            >
              <div
                v-if="m.role !== 'system'"
                :class="[
                  'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                  m.role === 'user' ? 'bg-brand-gradient text-white'
                    : m.error ? 'bg-red-500/10 border border-red-500/30 text-red-200'
                    : 'bg-white/5 border border-white/10 text-ink-100'
                ]"
              >
                <div>{{ m.text }}</div>
                <img v-if="m.image" :src="m.image" alt="generated" class="mt-2 rounded-lg max-w-full" />
                <video v-if="m.video" :src="m.video" controls class="mt-2 rounded-lg max-w-full" />
                <audio v-if="m.audio" :src="m.audio" controls class="mt-2 w-full" />
              </div>
              <div v-else class="mx-auto max-w-md text-center text-[11px] text-ink-500 italic">{{ m.key ? t(m.key) : m.text }}</div>
            </div>
            <div v-if="sending" class="flex justify-start">
              <div class="bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 inline-flex items-center gap-2 text-sm text-ink-300">
                <Loader2 class="h-3.5 w-3.5 animate-spin" /> {{ t('try.thinking', { m: selected.name }) }}
              </div>
            </div>
          </div>

          <form @submit.prevent="send" class="border-t border-white/5 p-4">
            <div class="flex items-end gap-2 rounded-2xl border border-white/10 bg-ink-900/60 p-2 focus-within:border-brand-500/40">
              <textarea
                v-model="input"
                rows="2"
                :placeholder="t('try.input.placeholder')"
                class="flex-1 resize-none bg-transparent px-3 py-2 text-sm placeholder-ink-500 focus:outline-none"
                @keydown.enter.exact.prevent="send"
              ></textarea>
              <button type="submit" :disabled="!input.trim() || sending"
                      :aria-label="t('common.send')"
                      class="btn btn-primary !rounded-xl !px-4 !py-2 disabled:opacity-40">
                <Send class="h-4 w-4" />
              </button>
            </div>
            <p class="mt-2 px-1 text-[11px] text-ink-500">
              <Sparkles class="inline h-3 w-3 -mt-0.5" />
              <template v-if="isLive">
                {{ t('try.noteLive', { upstream: selected.upstream }) }}
              </template>
              <template v-else-if="isDemo">
                {{ t('try.noteDemo') }}
              </template>
              <template v-else-if="isOverseas">
                {{ t('try.noteOverseas') }}
              </template>
              <template v-else-if="isComingSoon">
                {{ t('try.noteSoon') }}
              </template>
              <template v-else>
                {{ t('try.note') }} <code class="text-ink-400">src/api/</code>
              </template>
            </p>
          </form>
        </div>
      </div>
    </div>
  </section>
</template>