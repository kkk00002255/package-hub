# Package — One Platform, Every AI Model

> Vue 3 + Vite + Tailwind. 100+ AI models under one subscription: chat, image, video, music, voice, agents.

🌐 **Live**: [https://package-hub-kkk00002255.vercel.app](https://package-hub-kkk00002255.vercel.app)

---

## What's in the box

- **Landing page** — hero, AI agents, core capabilities, inspiration gallery, CTA
- **Model library** (`/models`) — 57 flagship models, search + category filter
- **Pricing** (`/pricing`) — Free / Pro / Team tiers
- **Try workspace** (`/try`) — model picker + chat workspace (currently mock — see "Wiring up an API" below)
- **i18n** — English + 中文, switchable from the nav bar (persisted to `localStorage`)
- **Dark theme** with cyan → violet → pink brand gradient

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Vue 3 (Composition API, `<script setup>`) |
| Build | Vite 5 |
| Router | vue-router 4 (history mode) |
| Styling | Tailwind CSS 3 + custom design tokens (`tailwind.config.js`) |
| Icons | lucide-vue-next |
| i18n | vue-i18n 9 |
| Hosting | Vercel (auto-deploy on push to `main`) |

---

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
```

```bash
npm run build    # → dist/
npm run preview  # serve dist/ on http://localhost:4173
```

---

## Project layout

```
src/
├── App.vue               # shell (NavBar + router-view + SiteFooter)
├── main.js               # bootstrap, router, i18n
├── style.css             # Tailwind layers + global utilities
├── router/               # (lives in main.js currently)
├── views/
│   ├── HomeView.vue
│   ├── ModelsView.vue
│   ├── PricingView.vue
│   └── TryView.vue
├── components/
│   ├── NavBar.vue
│   ├── SiteFooter.vue
│   ├── Hero.vue
│   ├── AgentsSection.vue
│   ├── CoreFeatures.vue
│   ├── InspirationSquare.vue
│   ├── CTASection.vue
│   └── ModelCard.vue
├── data/
│   ├── models.json       # 57 models, 6 categories
│   └── inspiration.json
└── i18n/
    ├── index.js          # createI18n + setLocale()
    ├── en.js             # English strings
    └── zh.js             # 中文 strings
```

---

## i18n — adding a string

1. Add the key to **both** `src/i18n/en.js` and `src/i18n/zh.js`:

   ```js
   'pricing.pro.badge': 'Most popular',   // en
   'pricing.pro.badge': '最受欢迎',         // zh
   ```

2. Use it in a component:

   ```vue
   <script setup>
   import { useI18n } from 'vue-i18n'
   const { t } = useI18n()
   </script>
   <template>
     <span>{{ t('pricing.pro.badge') }}</span>
   </template>
   ```

3. For interpolation:

   ```js
   'try.thinking': '{m} is thinking…'   // en
   // call: t('try.thinking', { m: 'GPT-5.5' })
   ```

The nav-bar **language switcher** persists to `localStorage['pkg-lang']` and updates `<html lang>` so screen readers and SEO get the right signal.

---

## Wiring up an API (Try page)

`/try` is currently a mock — when you send a message, it returns a placeholder after 900ms saying "X would respond here." To make it real:

1. **Add a serverless function** at `api/chat.js` (Vercel auto-detects):

   ```js
   export default async function handler(req, res) {
     const { text, model } = req.body
     const r = await fetch('https://api.deepseek.com/v1/chat/completions', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
       },
       body: JSON.stringify({
         model: 'deepseek-chat',
         messages: [{ role: 'user', content: text }]
       })
     })
     const data = await r.json()
     res.json({ result: data.choices[0].message.content })
   }
   ```

2. **Set `DEEPSEEK_API_KEY`** in Vercel Dashboard → Project → Settings → Environment Variables.

3. **Update `src/views/TryView.vue`** — replace the `setTimeout` mock in `send()` with `fetch('/api/chat', ...)`.

4. **Map model IDs** — `src/data/models.json` has IDs like `gpt-5.5`, `opus-4-7`. Add a `upstream` field that maps each to a real upstream model name (e.g., `deepseek-chat`, `claude-opus-4-1-20250805`), then look it up in the function.

---

## Deploy

Pushing to `main` auto-deploys to Vercel. No CI to manage.

To manually re-deploy after touching env vars or Vercel config:
- Vercel Dashboard → Deployments → click "..." on latest → "Redeploy", **or**
- `curl -X POST $VERCEL_DEPLOY_HOOK` if a Deploy Hook was created (see Vercel docs).

---

## Vercel config (`vercel.json`)

- `framework: "vite"` — Vercel auto-detects Vite build command + output dir
- `rewrites: [{ source: "/(.*)", destination: "/index.html" }]` — SPA routing, so `/models` and `/pricing` work on hard refresh
- `headers` — `/assets/*` get long-term immutable cache headers

---

## License

Private / unreleased. © 2026 Package.