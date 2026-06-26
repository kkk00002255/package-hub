<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import models from '../data/models.json'
import { Send, Sparkles, Loader2, Plus, MessageSquare, Trash2, Copy, Check, X, Pencil } from '@lucide/vue'

const { t } = useI18n()
const route = useRoute()
const selectedId = ref(route.params.model || models.models[0].id)
const input = ref('')
const sending = ref(false)
const sidebarOpen = ref(true) // mobile sidebar

// === 多 session 系统 ===
const STORAGE_KEY = 'package_sessions_v1'

function createSession(modelId = null) {
  const sid = 's_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
  return {
    id: sid,
    title: t('try.newChat'),
    modelId: modelId || selectedId.value || models.models[0].id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [{ role: 'system', key: 'try.system' }]
  }
}

const sessions = ref([])
const activeSessionId = ref(null)
const editingSessionId = ref(null)
const editingTitle = ref('')

const activeSession = computed(() => sessions.value.find(s => s.id === activeSessionId.value) || null)
const activeMessages = computed(() => activeSession.value?.messages || [])
const activeModel = computed(() => {
  const m = models.models.find(x => x.id === activeSession.value?.modelId)
  return m || models.models[0]
})

// 加载本地存储
function loadSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      if (Array.isArray(data.sessions) && data.sessions.length) {
        sessions.value = data.sessions
        activeSessionId.value = data.activeId || data.sessions[0].id
        if (activeSession.value?.modelId) selectedId.value = activeSession.value.modelId
        return
      }
    }
  } catch (e) { console.warn('load sessions err', e) }
  // 默认建一个 session
  const s = createSession()
  sessions.value = [s]
  activeSessionId.value = s.id
}

// 保存本地
function saveSessions() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      sessions: sessions.value,
      activeId: activeSessionId.value
    }))
  } catch (e) { console.warn('save err', e) }
}

watch([sessions, activeSessionId], saveSessions, { deep: true })

onMounted(() => {
  loadSessions()
})

// === session 操作 ===
function newSession() {
  const s = createSession(activeSession.value?.modelId || selectedId.value)
  s.messages = [{ role: 'system', key: 'try.system' }] // 不带历史
  sessions.value.unshift(s)
  activeSessionId.value = s.id
  selectedId.value = s.modelId
  sidebarOpen.value = false
}

function switchSession(sid) {
  if (activeSessionId.value === sid) return
  activeSessionId.value = sid
  const s = sessions.value.find(x => x.id === sid)
  if (s) selectedId.value = s.modelId
  sidebarOpen.value = false
}

function deleteSession(sid, e) {
  if (e) e.stopPropagation()
  if (sessions.value.length <= 1) {
    // 至少保留一个
    sessions.value = [createSession()]
    activeSessionId.value = sessions.value[0].id
    return
  }
  const idx = sessions.value.findIndex(s => s.id === sid)
  sessions.value = sessions.value.filter(s => s.id !== sid)
  if (activeSessionId.value === sid) {
    activeSessionId.value = sessions.value[Math.max(0, idx - 1)]?.id
  }
}

function startEditTitle(sid, e) {
  if (e) e.stopPropagation()
  const s = sessions.value.find(x => x.id === sid)
  if (!s) return
  editingSessionId.value = sid
  editingTitle.value = s.title
  nextTick(() => {
    const inp = document.querySelector(`input[data-sid="${sid}"]`)
    if (inp) { inp.focus(); inp.select() }
  })
}

function saveEditTitle(sid) {
  const s = sessions.value.find(x => x.id === sid)
  if (s && editingTitle.value.trim()) {
    s.title = editingTitle.value.trim().slice(0, 60)
  }
  editingSessionId.value = null
}

// 从首条 user 消息自动生成标题
function autoTitle(msg) {
  const t = (msg || '').replace(/\s+/g, ' ').trim().slice(0, 36)
  return t || '新对话'
}

// === 模型状态 (live/overseas/...) ===
const liveStatus = computed(() => activeModel.value?.status || (activeModel.value?.upstream ? 'live' : 'demo'))
const isLive = computed(() => liveStatus.value === 'live')
const isOverseas = computed(() => liveStatus.value === 'overseas')
const isComingSoon = computed(() => liveStatus.value === 'coming-soon')

const grouped = computed(() => {
  return models.categories.map(c => ({
    ...c,
    items: models.models.filter(m => m.category === c.id)
  })).filter(c => c.items.length)
})

// === Agent pipeline (6-26 虾) ===
// chat 模型可以输出 [IMAGE: ...] / [VIDEO: ...] / [MUSIC: ...] 块，
// TryView 自动接力给对应类别的默认模型。实现工作区多模型上下文共享。
function defaultModelFor(category) {
  const pref = ['live', 'demo']
  for (const s of pref) {
    const m = models.models.find(x => x.category === category && x.status === s && x.upstream)
    if (m) return m
  }
  return models.models.find(x => x.category === category) || null
}

// 检测 [KIND: prompt] 块，返回 [{kind, prompt}, ...] 和剥离标记后的剩余文本
function parseGenerationBlocks(text) {
  if (!text) return { cleanText: '', blocks: [] }
  const blocks = []
  let cleanText = text
  for (const kind of ['IMAGE', 'VIDEO', 'MUSIC']) {
    const re = new RegExp(`\\[${kind}:\\s*([\\s\\S]+?)\\]`, 'g')
    let m
    while ((m = re.exec(text)) !== null) {
      blocks.push({ kind: kind.toLowerCase(), prompt: m[1].trim() })
      cleanText = cleanText.replace(m[0], '').trim()
    }
  }
  return { cleanText, blocks }
}

const CHAT_SYSTEM_PROMPT = `You are a creative assistant inside Package — an all-in-one AI workspace where users can switch between Chat, Image, Video and Music models.

When the user asks for a generation (image / video / music), output a structured block in EXACTLY this format (English prompts, 50-150 words each):

\`\`\`
[IMAGE: <vivid visual prompt: subject, lighting, composition, style, mood, color palette>]
\`\`\`

or

\`\`\`
[VIDEO: <motion/scene prompt: subject, action, camera movement, 5-10s scene, atmosphere>]
\`\`\`

or

\`\`\`
[MUSIC: <music prompt: genre, mood, tempo BPM, instruments, optional vocal style or lyrics>]
\`\`\`

For text-only questions (writing, analysis, coding, Q&A, etc.), answer normally WITHOUT any [IMAGE/VIDEO/MUSIC] block.

You may include brief text BEFORE the block (intent, plan, or commentary), and the block triggers automatic generation in the user's workspace.`

// === 发送消息 ===
async function send() {
  const text = input.value.trim()
  if (!text || sending.value) return
  if (!activeSession.value) return

  activeSession.value.messages.push({ role: 'user', text })
  // 自动用首条消息作标题
  if (activeSession.value.messages.filter(m => m.role === 'user').length === 1) {
    activeSession.value.title = autoTitle(text)
  }
  activeSession.value.updatedAt = Date.now()
  input.value = ''
  sending.value = true
  // 滚动到底
  await nextTick()
  scrollToBottom()

  const cat = activeModel.value.category

  if (isComingSoon.value || isOverseas.value) {
    setTimeout(() => {
      const key = isOverseas.value ? 'try.overseas.reply' : 'try.comingsoon.reply'
      activeSession.value.messages.push({
        role: 'assistant',
        text: t(key, { m: activeModel.value.name }),
        muted: true
      })
      sending.value = false
      nextTick(scrollToBottom)
    }, 600)
    return
  }

  if (cat === 'image') return await sendImage(text)
  if (cat === 'video') return await sendVideo(text)
  if (cat === 'voice' || cat === 'music') return await sendAudio(text)

  return await sendChat()
}

async function sendChat() {
  // 历史记录：把 image/video/audio 的存在告诉 chat（多模态上下文）
  const history = activeSession.value.messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => {
      if (m.role === 'user') return { role: 'user', content: m.text }
      let content = m.text || ''
      const tags = []
      if (m.image) tags.push('[上面生成了一张图片]')
      if (m.video) tags.push('[上面生成了一个视频]')
      if (m.audio) tags.push('[上面生成了一段音频]')
      if (tags.length) content += (content ? '\n\n' : '') + tags.join(' ')
      return { role: 'assistant', content }
    })

  // 注入 system prompt（让 chat 学会输出生成标记）
  const messages = [{ role: 'system', content: CHAT_SYSTEM_PROMPT }, ...history]

  try {
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        model: activeModel.value.upstream
      })
    })

    let data
    try { data = await r.json() } catch { throw new Error('Invalid response from server') }
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`)

    const out = data.result || data.reasoning_content || ''

    // 解析 generation blocks — agent pipeline 6-26
    const { cleanText, blocks } = parseGenerationBlocks(out)

    // 插入 chat 文本回复（去掉生成标记后）
    if (cleanText) {
      activeSession.value.messages.push({
        role: 'assistant',
        kind: 'text',
        text: cleanText,
        reasoning: data.actualModel || data.requestedModel || '',
        streaming: false
      })
    }

    // 自动接力：按顺序调 image / video / music（每个 block 独立生成）
    for (const block of blocks) {
      if (block.kind === 'image') {
        const m = defaultModelFor('image')
        if (m) await sendImage(block.prompt, m, true)
      } else if (block.kind === 'video') {
        const m = defaultModelFor('video')
        if (m) await sendVideo(block.prompt, m, true)
      } else if (block.kind === 'music') {
        const m = defaultModelFor('music')
        if (m) await sendAudio(block.prompt, m, true)
      }
    }

    // chat 输出没有任何内容也没生成块 → fallback 提示
    if (!cleanText && blocks.length === 0) {
      activeSession.value.messages.push({
        role: 'assistant',
        kind: 'text',
        text: t('try.empty'),
        reasoning: data.actualModel || data.requestedModel || ''
      })
    }
  } catch (e) {
    activeSession.value.messages.push({
      role: 'assistant',
      kind: 'text',
      text: `⚠️ ${e.message || t('try.error')}`,
      error: true
    })
  } finally {
    sending.value = false
    nextTick(scrollToBottom)
  }
}

async function sendImage(prompt, modelOverride = null, inPipeline = false) {
  const m = modelOverride || activeModel.value
  try {
    activeSession.value.messages.push({
      role: 'assistant',
      kind: 'image-loading',
      text: `🎨 正在用 ${m.name} 生成图片...`,
      muted: true
    })
    const r = await fetch('/api/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model: m.upstream, size: '1024x1024', n: 1 })
    })
    const data = await r.json()
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`)
    if (data.images?.length) {
      activeSession.value.messages.push({
        role: 'assistant',
        kind: 'image',
        text: `Generated image [${data.model}]:`,
        image: data.images[0].url || data.images[0]
      })
    } else {
      activeSession.value.messages.push({ role: 'assistant', kind: 'text', text: t('try.empty') })
    }
  } catch (e) {
    activeSession.value.messages.push({ role: 'assistant', kind: 'text', text: `⚠️ ${e.message || t('try.error')}`, error: true })
  } finally {
    if (!inPipeline) sending.value = false
    nextTick(scrollToBottom)
  }
}

async function sendVideo(prompt, modelOverride = null, inPipeline = false) {
  const m = modelOverride || activeModel.value
  try {
    activeSession.value.messages.push({
      role: 'assistant',
      kind: 'video-loading',
      text: `🎬 正在用 ${m.name} 生成 5 秒视频 (需 30-90 秒)...`,
      muted: true
    })
    let inputImage = null
    for (let i = activeSession.value.messages.length - 1; i >= 0; i--) {
      if (activeSession.value.messages[i].image) { inputImage = activeSession.value.messages[i].image; break }
    }
    const r = await fetch('/api/video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model: m.upstream, image: inputImage, frames: 60, fps: 12, duration: 5 })
    })
    const data = await r.json()
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`)
    if (data.videos?.length) {
      activeSession.value.messages.push({
        role: 'assistant',
        kind: 'video',
        text: `Generated video [${data.model}]:`,
        video: data.videos[0].url || data.videos[0]
      })
    } else {
      activeSession.value.messages.push({ role: 'assistant', kind: 'text', text: t('try.empty') })
    }
  } catch (e) {
    activeSession.value.messages.push({ role: 'assistant', kind: 'text', text: `⚠️ ${e.message || t('try.error')}`, error: true })
  } finally {
    if (!inPipeline) sending.value = false
    nextTick(scrollToBottom)
  }
}

async function sendAudio(text, modelOverride = null, inPipeline = false) {
  const m = modelOverride || activeModel.value
  try {
    activeSession.value.messages.push({
      role: 'assistant',
      kind: 'audio-loading',
      text: `🎵 正在用 ${m.name} 生成音频...`,
      muted: true
    })
    const r = await fetch('/api/audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model: m.upstream })
    })
    const data = await r.json()
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`)
    if (data.audio) {
      activeSession.value.messages.push({ role: 'assistant', kind: 'audio', text: `Generated audio [${data.model}]:`, audio: data.audio })
    } else {
      activeSession.value.messages.push({ role: 'assistant', kind: 'text', text: t('try.empty') })
    }
  } catch (e) {
    activeSession.value.messages.push({ role: 'assistant', kind: 'text', text: `⚠️ ${e.message || t('try.error')}`, error: true })
  } finally {
    if (!inPipeline) sending.value = false
    nextTick(scrollToBottom)
  }
}

// === markdown 渲染 (轻量自研) ===
function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]))
}

function renderMd(text) {
  if (!text) return ''
  let s = escapeHtml(text)
  // 代码块 ```lang\n...```
  s = s.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre class="md-code"><code class="lang-${lang}">${code.trim()}</code></pre>`
  })
  // 行内代码 `...`
  s = s.replace(/`([^`\n]+)`/g, '<code class="md-inline">$1</code>')
  // 标题
  s = s.replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>')
  s = s.replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>')
  s = s.replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>')
  // 引用
  s = s.replace(/^&gt; (.+)$/gm, '<blockquote class="md-quote">$1</blockquote>')
  s = s.replace(/^> (.+)$/gm, '<blockquote class="md-quote">$1</blockquote>')
  // 表格 (简单)
  s = s.replace(/((?:\|.+\|\n)+)/g, (block) => {
    const rows = block.trim().split('\n').filter(r => r.trim())
    if (rows.length < 2) return block
    const parseRow = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())
    const header = parseRow(rows[0])
    const isSep = row => /^[\s\-:|]+$/.test(row)
    if (rows.length > 1 && isSep(parseRow(rows[1]).join('|'))) {
      const body = rows.slice(2).map(parseRow)
      return `<table class="md-table"><thead><tr>${header.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    }
    return `<table class="md-table"><tbody>${rows.map(parseRow).map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`
  })
  // 列表
  s = s.replace(/^[•\-\*] (.+)$/gm, '<li>$1</li>')
  s = s.replace(/(<li>[\s\S]+?<\/li>)(?!\s*<li>)/g, '<ul class="md-ul">$1</ul>')
  s = s.replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
  s = s.replace(/(<li>[\s\S]+?<\/li>)(?!\s*<li>)/g, '<ol class="md-ol">$1</ol>')
  // 粗体/斜体
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
  // 链接 [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="md-link">$1</a>')
  // 段落（双换行）
  s = s.replace(/\n\n+/g, '</p><p class="md-p">')
  s = '<p class="md-p">' + s + '</p>'
  // 清理空 p
  s = s.replace(/<p class="md-p"><\/p>/g, '')
  s = s.replace(/<p class="md-p">(<h[1-3])/g, '$1')
  s = s.replace(/(<\/h[1-3]>)<\/p>/g, '$1')
  s = s.replace(/<p class="md-p">(<pre)/g, '$1')
  s = s.replace(/(<\/pre>)<\/p>/g, '$1')
  s = s.replace(/<p class="md-p">(<table)/g, '$1')
  s = s.replace(/(<\/table>)<\/p>/g, '$1')
  s = s.replace(/<p class="md-p">(<blockquote)/g, '$1')
  s = s.replace(/(<\/blockquote>)<\/p>/g, '$1')
  s = s.replace(/<p class="md-p">(<[uo]l)/g, '$1')
  s = s.replace(/(<\/[uo]l>)<\/p>/g, '$1')
  return s
}

// 滚动到底
function scrollToBottom() {
  const el = document.getElementById('messages-scroll')
  if (el) el.scrollTop = el.scrollHeight
}

// 复制消息
const copiedId = ref(null)
async function copyMessage(idx) {
  const m = activeMessages.value[idx]
  if (!m) return
  try {
    await navigator.clipboard.writeText(m.text || '')
    copiedId.value = idx
    setTimeout(() => { copiedId.value = null }, 1500)
  } catch (e) { console.warn(e) }
}

// 删除单条消息
function deleteMessage(idx) {
  if (!activeSession.value) return
  activeSession.value.messages.splice(idx, 1)
}

// 重生成（最后一条 assistant）
function regen() {
  if (!activeSession.value) return
  const msgs = activeSession.value.messages
  // 找最后一个 user 消息
  let lastUserIdx = -1
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role === 'user') { lastUserIdx = i; break }
  }
  if (lastUserIdx < 0) return
  // 截断到 user 消息
  activeSession.value.messages = msgs.slice(0, lastUserIdx + 1)
  input.value = msgs[lastUserIdx].text
  send()
}

function onModelChange() {
  if (activeSession.value) activeSession.value.modelId = selectedId.value
}
</script>

<template>
  <section class="relative py-8 sm:py-10">
    <div class="container-x">
      <!-- 移动端遮罩 -->
      <div v-if="sidebarOpen" @click="sidebarOpen = false"
           class="fixed inset-0 bg-black/50 z-30 lg:hidden"></div>

      <div class="grid gap-4 lg:gap-5 lg:grid-cols-[260px_1fr]">
        <!-- 左侧: 多 session 列表 -->
        <aside :class="['lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto',
                         'fixed lg:static inset-y-0 left-0 z-40 w-72 lg:w-auto bg-ink-950/95 lg:bg-transparent',
                         'p-4 lg:p-0 transition-transform duration-200',
                         sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0']">

          <!-- 新对话按钮 -->
          <button @click="newSession"
                  class="w-full mb-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-medium text-sm hover:opacity-90 transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20">
            <Plus class="h-4 w-4" /> {{ t('try.newChat') }}
          </button>

          <!-- session 列表 -->
          <div class="space-y-1">
            <div v-for="s in sessions" :key="s.id"
                 @click="switchSession(s.id)"
                 :class="['group cursor-pointer px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition',
                          s.id === activeSessionId
                            ? 'bg-white/10 border border-cyan-500/40 text-white'
                            : 'hover:bg-white/5 text-ink-300 border border-transparent']">
              <MessageSquare class="h-3.5 w-3.5 shrink-0 opacity-60" />
              <input v-if="editingSessionId === s.id"
                     v-model="editingTitle"
                     :data-sid="s.id"
                     @keyup.enter="saveEditTitle(s.id)"
                     @keyup.esc="editingSessionId = null"
                     @blur="saveEditTitle(s.id)"
                     @click.stop
                     class="flex-1 bg-transparent border-b border-cyan-500/50 px-1 text-sm focus:outline-none" />
              <span v-else class="flex-1 truncate text-sm" @dblclick.stop="startEditTitle(s.id, $event)">{{ s.title }}</span>
              <div class="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0">
                <button @click.stop="startEditTitle(s.id, $event)" class="p-1 rounded hover:bg-white/10" :aria-label="t('common.rename')">
                  <Pencil class="h-3 w-3 text-ink-400" />
                </button>
                <button @click.stop="deleteSession(s.id, $event)" class="p-1 rounded hover:bg-red-500/20" :aria-label="t('common.delete')">
                  <Trash2 class="h-3 w-3 text-red-300" />
                </button>
              </div>
            </div>
          </div>

        </aside>

        <!-- 中间: workspace -->
        <div class="grad-border flex flex-col min-h-[80vh]">
          <!-- header -->
          <div class="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-white/5 flex-wrap">
            <div class="flex items-center gap-3 min-w-0">
              <button @click="sidebarOpen = true" class="lg:hidden p-1.5 rounded hover:bg-white/5 shrink-0">
                <MessageSquare class="h-4 w-4" />
              </button>
              <div class="hidden sm:block min-w-0">
                <div class="text-[10px] uppercase tracking-wider text-ink-500">{{ t('try.workspace') }}</div>
                <div class="text-sm font-semibold text-white truncate">{{ activeModel.vendor }}</div>
              </div>
            </div>

            <!-- Model picker (桌面端可见) -->
            <div class="flex items-center gap-2 flex-1 sm:flex-initial min-w-0 max-w-full">
              <label class="text-[10px] uppercase tracking-wider text-ink-500 shrink-0 hidden md:inline">{{ t('try.pickModel') }}</label>
              <div class="relative flex-1 sm:flex-initial min-w-0 max-w-[280px] sm:max-w-[340px]">
                <select
                  v-model="selectedId"
                  @change="onModelChange"
                  class="w-full appearance-none pl-3 pr-8 py-1.5 rounded-lg bg-zinc-900/80 border border-white/15 text-sm text-white focus:outline-none focus:border-cyan-500/50 focus:bg-zinc-900 cursor-pointer hover:bg-zinc-800/80 transition"
                  style="color-scheme: dark;">
                  <optgroup v-for="g in grouped" :key="g.id" :label="g.label" class="bg-zinc-900 text-ink-300">
                    <option v-for="m in g.items" :key="m.id" :value="m.id" class="bg-zinc-900 text-white">
                      {{ m.name }}{{ m.tier === 'flagship' ? ' ★' : '' }}{{ m.status === 'overseas' ? ' (海外)' : m.status === 'demo' ? ' (demo)' : m.status === 'coming-soon' ? (m.name.length > 0 ? ' (即将)' : '') : '' }}
                    </option>
                  </optgroup>
                </select>
                <svg class="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <span class="chip shrink-0" :class="isLive ? '' : 'opacity-60'">
              <span class="h-1.5 w-1.5 rounded-full"
                    :class="isLive ? 'bg-emerald-400' : isOverseas ? 'bg-sky-400' : isComingSoon ? 'bg-ink-500' : 'bg-amber-400'"></span>
              {{ isLive ? t('try.status.live') : isOverseas ? t('try.status.overseas') : isComingSoon ? t('try.status.coming-soon') : t('try.status.demo') }}
            </span>
          </div>

          <!-- messages -->
          <div id="messages-scroll" class="flex-1 px-4 sm:px-5 py-6 space-y-4 overflow-y-auto">
            <template v-for="(m, i) in activeMessages" :key="i">
              <!-- system hint -->
              <div v-if="m.role === 'system'" class="mx-auto max-w-md text-center text-[11px] text-ink-500 italic px-3 py-2 rounded-lg border border-dashed border-white/10">
                {{ m.key ? t(m.key) : m.text }}
              </div>

              <!-- user -->
              <div v-else-if="m.role === 'user'" class="flex justify-end group">
                <div class="max-w-[80%] flex flex-col items-end gap-1">
                  <div class="rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed bg-gradient-to-br from-cyan-500/90 to-violet-500/90 text-white shadow-md">
                    <div class="whitespace-pre-wrap break-words">{{ m.text }}</div>
                  </div>
                  <div class="opacity-0 group-hover:opacity-100 flex gap-0.5">
                    <button @click="copyMessage(i)" class="p-1 rounded hover:bg-white/10" :aria-label="t('common.copy')">
                      <Copy v-if="copiedId !== i" class="h-3 w-3 text-ink-400" />
                      <Check v-else class="h-3 w-3 text-emerald-400" />
                    </button>
                    <button @click="deleteMessage(i)" class="p-1 rounded hover:bg-red-500/20" :aria-label="t('common.delete')">
                      <Trash2 class="h-3 w-3 text-red-300" />
                    </button>
                  </div>
                </div>
              </div>

              <!-- assistant -->
              <div v-else class="flex justify-start group">
                <div class="max-w-[85%] flex flex-col items-start gap-1">
                  <div :class="['rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed',
                                m.error ? 'bg-red-500/10 border border-red-500/30 text-red-200'
                                        : m.muted ? 'bg-white/3 border border-white/5 text-ink-400 italic'
                                        : 'bg-white/[0.06] border border-white/10 text-ink-100']">
                    <div v-if="m.kind && m.kind.endsWith('-loading')" class="flex items-center gap-2">
                      <Loader2 class="h-3.5 w-3.5 animate-spin" />
                      <span v-html="renderMd(m.text)"></span>
                    </div>
                    <div v-else v-html="renderMd(m.text)"></div>
                    <img v-if="m.image" :src="m.image" alt="generated" class="mt-2 rounded-lg max-w-full border border-white/10" />
                    <video v-if="m.video" :src="m.video" controls class="mt-2 rounded-lg max-w-full border border-white/10"></video>
                    <audio v-if="m.audio" :src="m.audio" controls class="mt-2 w-full"></audio>
                    <div v-if="m.reasoning" class="mt-2 pt-2 border-t border-white/10 text-[11px] text-ink-500">
                      {{ t('try.actualModel', { m: m.reasoning }) }}
                    </div>
                  </div>
                  <div class="opacity-0 group-hover:opacity-100 flex gap-0.5">
                    <button @click="copyMessage(i)" class="p-1 rounded hover:bg-white/10" :aria-label="t('common.copy')">
                      <Copy v-if="copiedId !== i" class="h-3 w-3 text-ink-400" />
                      <Check v-else class="h-3 w-3 text-emerald-400" />
                    </button>
                    <button v-if="i === activeMessages.length - 1" @click="regen" class="p-1 rounded hover:bg-white/10" :aria-label="t('try.regen')">
                      <Sparkles class="h-3 w-3 text-ink-400" />
                    </button>
                    <button @click="deleteMessage(i)" class="p-1 rounded hover:bg-red-500/20" :aria-label="t('common.delete')">
                      <Trash2 class="h-3 w-3 text-red-300" />
                    </button>
                  </div>
                </div>
              </div>
            </template>

            <div v-if="sending" class="flex justify-start">
              <div class="bg-white/[0.06] border border-white/10 rounded-2xl rounded-tl-sm px-4 py-2.5 inline-flex items-center gap-2 text-sm text-ink-300">
                <Loader2 class="h-3.5 w-3.5 animate-spin" /> {{ t('try.thinking', { m: activeModel.name }) }}
              </div>
            </div>
          </div>

          <!-- input -->
          <form @submit.prevent="send" class="border-t border-white/5 p-3 sm:p-4">
            <div class="flex items-end gap-2 rounded-2xl border border-white/10 bg-ink-900/60 p-2 focus-within:border-cyan-500/40 transition">
              <textarea
                v-model="input"
                rows="2"
                :placeholder="t('try.input.placeholder')"
                class="flex-1 resize-none bg-transparent px-3 py-2 text-sm placeholder-ink-500 focus:outline-none max-h-32"
                @keydown.enter.exact.prevent="send"
              ></textarea>
              <button type="submit" :disabled="!input.trim() || sending"
                      :aria-label="t('common.send')"
                      class="btn btn-primary !rounded-xl !px-4 !py-2 disabled:opacity-40 shrink-0">
                <Send class="h-4 w-4" />
              </button>
            </div>
            <p class="mt-2 px-1 text-[11px] text-ink-500 flex items-center gap-1">
              <Sparkles class="inline h-3 w-3 -mt-0.5" />
              <span v-if="isLive">{{ t('try.noteLive', { upstream: activeModel.upstream }) }}</span>
              <span v-else-if="isOverseas">{{ t('try.noteOverseas') }}</span>
              <span v-else-if="isComingSoon">{{ t('try.noteSoon') }}</span>
              <span v-else>{{ t('try.note') }}</span>
            </p>
          </form>
        </div>
      </div>
    </div>
  </section>
</template>

<style>
/* markdown 样式 — 仿 deepseek / 豆包 */
.md-p { margin: 0 0 0.65em 0; line-height: 1.65; }
.md-p:last-child { margin-bottom: 0; }
.md-h1 { font-size: 1.35em; font-weight: 700; margin: 0.6em 0 0.3em; color: #fff; }
.md-h2 { font-size: 1.2em; font-weight: 700; margin: 0.55em 0 0.25em; color: #fff; }
.md-h3 { font-size: 1.05em; font-weight: 600; margin: 0.5em 0 0.2em; color: #fff; }
.md-inline { background: rgba(255,255,255,0.08); padding: 1px 5px; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.88em; color: #ffd28a; }
.md-code { background: #0d1117; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px 14px; margin: 0.6em 0; overflow-x: auto; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; line-height: 1.55; color: #e6edf3; }
.md-code code { background: transparent; padding: 0; color: inherit; font-size: inherit; }
.md-quote { border-left: 3px solid #8b5cf6; padding: 4px 0 4px 12px; margin: 0.5em 0; color: #c4b5fd; background: rgba(139,92,246,0.06); border-radius: 0 6px 6px 0; }
.md-table { border-collapse: collapse; width: 100%; margin: 0.6em 0; font-size: 0.9em; }
.md-table th, .md-table td { border: 1px solid rgba(255,255,255,0.12); padding: 6px 10px; text-align: left; }
.md-table th { background: rgba(255,255,255,0.06); font-weight: 600; color: #fff; }
.md-table tr:nth-child(even) td { background: rgba(255,255,255,0.02); }
.md-ul, .md-ol { margin: 0.4em 0 0.4em 1.2em; padding: 0; }
.md-ul li, .md-ol li { margin: 0.15em 0; line-height: 1.6; }
.md-link { color: #67e8f9; text-decoration: underline; text-decoration-color: rgba(103,232,249,0.4); }
.md-link:hover { color: #a5f3fc; }
.md-table pre, .md-quote pre { display: inline; }
</style>
