<script setup>
import { MessageCircle } from '@lucide/vue'

const TwitterIcon = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor'><path d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'/></svg>`
const GithubIcon = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor'><path d='M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12'/></svg>`
</script>

<template>
  <footer class="relative mt-24 border-t border-white/5">
    <div class="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />
    <div class="container-x py-14">
      <div class="grid gap-10 md:grid-cols-5">
        <div class="md:col-span-2">
          <div class="flex items-center gap-2.5">
            <span class="relative inline-flex h-8 w-8 items-center justify-center rounded-xl bg-brand-gradient shadow-glow-brand overflow-hidden">
              <svg viewBox="0 0 64 64" class="h-8 w-8" aria-hidden="true">
                <g>
                  <rect x="10" y="34" width="32" height="7" rx="2.5" fill="rgba(255,255,255,0.4)"/>
                  <rect x="13" y="25" width="34" height="7" rx="2.5" fill="rgba(255,255,255,0.6)"/>
                  <rect x="16" y="16" width="36" height="7" rx="2.5" fill="rgba(255,255,255,0.85)"/>
                  <rect x="19" y="7"  width="30" height="7" rx="2.5" fill="white"/>
                </g>
              </svg>
            </span>
            <span class="text-lg font-semibold tracking-tight"><span class="grad-text">Package</span></span>
          </div>
          <p class="mt-4 max-w-sm text-sm text-ink-400 leading-relaxed">
            One platform, every AI model. Built so creators and teams can stop juggling subscriptions and start shipping.
          </p>
          <div class="mt-5 flex items-center gap-3">
            <a href="#" aria-label="Twitter" class="p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition" v-html="`<span class='block h-4 w-4'>${TwitterIcon}</span>`"></a>
            <a href="#" aria-label="GitHub" class="p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition" v-html="`<span class='block h-4 w-4'>${GithubIcon}</span>`"></a>
            <a href="#" aria-label="Telegram" class="p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition"><MessageCircle class="h-4 w-4" /></a>
          </div>
        </div>

        <div>
          <div class="text-xs font-semibold uppercase tracking-wider text-ink-500">Product</div>
          <ul class="mt-4 space-y-2.5 text-sm text-ink-300">
            <li><router-link to="/models" class="hover:text-white">Models</router-link></li>
            <li><router-link to="/pricing" class="hover:text-white">Pricing</router-link></li>
            <li><router-link to="/try" class="hover:text-white">Try it</router-link></li>
            <li><a href="#agents" class="hover:text-white">Agents</a></li>
          </ul>
        </div>
        <div>
          <div class="text-xs font-semibold uppercase tracking-wider text-ink-500">Resources</div>
          <ul class="mt-4 space-y-2.5 text-sm text-ink-300">
            <li><a href="#" class="hover:text-white">Documentation</a></li>
            <li><a href="#" class="hover:text-white">API reference</a></li>
            <li><a href="#" class="hover:text-white">Changelog</a></li>
            <li><a href="#" class="hover:text-white">Status</a></li>
          </ul>
        </div>
        <div>
          <div class="text-xs font-semibold uppercase tracking-wider text-ink-500">Company</div>
          <ul class="mt-4 space-y-2.5 text-sm text-ink-300">
            <li><a href="#" class="hover:text-white">About</a></li>
            <li><a href="#" class="hover:text-white">Support</a></li>
            <li><a href="#" class="hover:text-white">Privacy</a></li>
            <li><a href="#" class="hover:text-white">Terms</a></li>
          </ul>
        </div>
      </div>

      <div class="mt-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-white/5 pt-6 text-xs text-ink-500">
        <p>© {{ new Date().getFullYear() }} Package. All rights reserved.</p>
        <p>Made with care · <span class="text-ink-400">100+ models, one subscription</span></p>
      </div>
    </div>
  </footer>
</template>