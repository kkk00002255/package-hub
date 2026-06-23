import { createI18n } from 'vue-i18n'
import en from './en.js'
import zh from './zh.js'

const stored = (typeof localStorage !== 'undefined' && localStorage.getItem('pkg-lang')) || 'en'

export const i18n = createI18n({
  legacy: false,
  locale: stored,
  fallbackLocale: 'en',
  messages: { en, zh }
})

export function setLocale(loc) {
  i18n.global.locale.value = loc
  if (typeof localStorage !== 'undefined') localStorage.setItem('pkg-lang', loc)
  document.documentElement.lang = loc === 'zh' ? 'zh-CN' : 'en'
}