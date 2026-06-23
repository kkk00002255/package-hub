import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import { i18n } from './i18n'
import './style.css'

import HomeView from './views/HomeView.vue'
import ModelsView from './views/ModelsView.vue'
import PricingView from './views/PricingView.vue'
import TryView from './views/TryView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView, meta: { title: 'Package — One Platform, Every AI Model' } },
    { path: '/models', name: 'models', component: ModelsView, meta: { title: 'All Models · Package' } },
    { path: '/pricing', name: 'pricing', component: PricingView, meta: { title: 'Pricing · Package' } },
    { path: '/try/:model?', name: 'try', component: TryView, meta: { title: 'Try it · Package' } }
  ],
  scrollBehavior(to, from, saved) {
    if (saved) return saved
    return { top: 0 }
  }
})

router.afterEach((to) => {
  if (to.meta?.title) document.title = to.meta.title
})

const app = createApp(App)
app.use(router)
app.use(i18n)
app.mount('#app')

// sync initial <html lang>
document.documentElement.lang = i18n.global.locale.value === 'zh' ? 'zh-CN' : 'en'