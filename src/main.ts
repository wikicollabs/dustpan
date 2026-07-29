/**
 * SPDX-License-Identifier: GPL-2.0-or-later
 *
 * Dustpan
 * A tool to uncover WikiProjects that can be improved on Wikidata
 * @see https://github.com/wikicollabs/dustpan
 */

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import i18n from './i18n/i18n'
import '@wikimedia/codex-design-tokens/theme-wikimedia-ui.css'
import '@wikimedia/codex/dist/codex.style-bidi.css';

const app = createApp(App);

app.use(createPinia());
app.use(i18n);

app.provide('CdxI18nFunction', (key: string, ...params: unknown[]): string => {
  const translatedKeys = [
    'cdx-table-pagination-status-message-determinate-short',
    'cdx-table-pagination-status-message-determinate-long',
    'cdx-table-pager-items-per-page-current',
    'cdx-table-pager-button-first-page',
    'cdx-table-pager-button-last-page',
    'cdx-table-pager-button-next-page',
    'cdx-table-pager-button-prev-page',
    'cdx-dialog-close-button-label'
  ];
  
  if (!translatedKeys.includes(key)) {
    return key; 
  }
  
  const unwrapRef = (val: unknown) =>
    (val as { value?: unknown })?.value !== undefined ? (val as { value: unknown }).value : val;
  const unwrappedParams = params.map(unwrapRef);
  
  return app.config.globalProperties.$i18n(key, ...unwrappedParams);
});



// version-based localStorage invalidation
const APP_VERSION = '0.0.1';
const storedVersion = localStorage.getItem('dustpan_version');

if (storedVersion !== APP_VERSION) {
  localStorage.clear();
  localStorage.setItem('dustpan_version', APP_VERSION);
}



// apply theme immediately to prevent flash
const theme = localStorage?.getItem('theme');

if (theme === 'dark') {
  document.documentElement.classList.add('dark')
} else if (theme === 'light') {
  document.documentElement.classList.add('light')
} else {
  // 'auto', or no saved preference: fall back to system preference
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark')
  }
}

const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ps', 'ur', 'yi'];
const savedLocale = localStorage.getItem('locale') || 'en';
const langCode = savedLocale.split('-')[0];
const isRTL = RTL_LANGUAGES.includes(langCode);

document.documentElement.dir = isRTL ? 'rtl' : 'ltr';

const savedTextSize = localStorage.getItem('dustpan_text_size') || 'medium';
document.documentElement.setAttribute('font-size', savedTextSize);

app.mount('#app');