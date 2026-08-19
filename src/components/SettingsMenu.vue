<!--
  SPDX-License-Identifier: GPL-2.0-or-later

  Dustpan
  A tool to uncover WikiProjects that can be improved on Wikidata
  @see https://github.com/wikicollabs/dustpan
-->

<template>
  <div class="settings-menu">
    <cdx-menu-button
      v-model:selected="selectedItem"
      :menu-items="menuItems"
      :aria-label="$i18n('settings-menu-label-aria')"
    >
      <template #default>
        <cdx-icon :icon="cdxIconMenu" />
      </template>
    </cdx-menu-button>

    <!-- theme dialog -->
    <!--
      ariaLabel intentionally omitted from primary-action/default-action below.
      codex's ModalAction/PrimaryModalAction types don't support it and Dialog.vue
      doesn't read it. The designer requirement for a distinct accessible name on
      these buttons is unmet as of this codex version, tracked separately, not
      solved by re-adding the key.
    -->
    <cdx-dialog
      v-model:open="showThemeDialog"
      :title="$i18n('settings-theme-label')"
      :use-close-button="true"
      :close-button-label="$i18n('cdx-dialog-close-button-label')"
      :primary-action="{
        label: $i18n('settings-apply'),
        actionType: 'progressive',
        disabled: !hasThemeChanged,
      }"
      :default-action="{
        label: $i18n('settings-cancel'),
      }"
      @primary="saveTheme"
      @default="showThemeDialog = false"
    >
      <div class="dialog-content">
        <cdx-field 
        :label="$i18n('settings-theme-label')"
        :hide-label="true"
        :is-fieldset="true" 
        >
          <cdx-radio v-model="tempTheme" name="theme" input-value="auto" :aria-label="$i18n('settings-theme-auto-aria')">
            <template #default> {{ $i18n('settings-theme-auto') }} </template>
            <template #description>
              <span class="radio-description">{{ $i18n('settings-theme-auto-description') }}</span>
            </template>
          </cdx-radio>
          <cdx-radio v-model="tempTheme" name="theme" input-value="light" :aria-label="$i18n('settings-theme-light')">
            {{ $i18n('settings-theme-light') }}
          </cdx-radio>
          <cdx-radio v-model="tempTheme" name="theme" input-value="dark" :aria-label="$i18n('settings-theme-dark')">
            {{ $i18n('settings-theme-dark') }}
          </cdx-radio>
        </cdx-field>
      </div>
    </cdx-dialog>

    <!-- display language dialog -->
    <cdx-dialog
      v-model:open="showLanguageDialog"
      :title="$i18n('settings-language-label')"
      :fixed-height="true"
      :primary-action="{
        label: $i18n('settings-apply'),
        actionType: 'progressive',
        disabled: !hasLanguageChanged,
      }"
      :default-action="{
        label: $i18n('settings-cancel'),
      }"
      @primary="saveLanguage"
      @default="showLanguageDialog = false"
    >
      <!-- header for language dialog -->
      <template #header>
        <div class="settings-dialog__header-content">
          <cdx-text-input
            v-model="languageSearchQuery"
            class="settings-dialog__search"
            :start-icon="cdxIconSearch"
            :clearable="true"
            :placeholder="$i18n('settings-language-search-placeholder')"
            :aria-label="languageSearchQuery || $i18n('settings-language-search-placeholder')"
            />

          <cdx-button
            weight="quiet"
            :aria-label="$i18n('settings-close')"
            @click="showLanguageDialog = false"
          >
            <cdx-icon :icon="cdxIconClose" />
          </cdx-button>
        </div>
      </template>

      <!-- body for language dialog -->
      <div class="settings-dialog__body">
        <div class="settings-dialog__scroll-content">
          <cdx-field
            :label="$i18n('settings-language-label')"
            :hide-label="true"
            :is-fieldset="true"
          >
            <cdx-radio
              v-for="lang in filteredLanguages"
              :key="lang.code"
              v-model="tempLanguage"
              name="language"
              :input-value="lang.code"
              :aria-label="lang.nativeName"
            >
              {{ lang.nativeName }}
            </cdx-radio>
          </cdx-field>

          <div
            v-show="filteredLanguages.length === 0"
            class="no-results"
          >
            <p>
              {{ $i18n('settings-language-no-results') }}
              <br>
              {{ $i18n('settings-language-no-results-suggestion') }}
            </p>
          </div>
        </div>
      </div>

      <!-- footer for language dialog -->
      <template #footer-text>
        <span class="translate-help"> 
          {{ $i18n('settings-language-reload', 'Dustpan') }}
          <br>
          {{ $i18n('settings-translate-help') }}
          <a 
            href="https://translatewiki.net/wiki/Translating:Dustpan" 
            target="_blank" 
            rel="noopener"
            class="translate-link"
            :aria-label="$i18n('settings-translate-link', 'Dustpan')"
          >
            {{ $i18n('settings-translate-link', 'Dustpan') }}
          </a>
        </span>
      </template>
    </cdx-dialog>

    <!-- text size dialog -->
    <cdx-dialog
      v-model:open="showTextSizeDialog"
      :title="$i18n('settings-text-size-label')"
      :use-close-button="true"
      :close-button-label="$i18n('cdx-dialog-close-button-label')"
      :primary-action="{
        label: $i18n('settings-apply'),
        actionType: 'progressive',
        disabled: tempTextSize === currentTextSize,
      }"
      :default-action="{
        label: $i18n('settings-cancel'),
      }"
      @primary="saveTextSize"
      @default="showTextSizeDialog = false"
    >
      <div class="dialog-content">
        <cdx-field 
        :label="$i18n('settings-text-size-label')"
        :hide-label="true"
        :is-fieldset="true" 
        >
          <cdx-radio 
            v-model="tempTextSize" 
            name="text-size" 
            input-value="small" 
            :aria-label="$i18n('settings-text-size-small')"
          >
            {{ $i18n('settings-text-size-small') }}
          </cdx-radio>

          <cdx-radio 
            v-model="tempTextSize" 
            name="text-size" 
            input-value="medium" 
            :aria-label="$i18n('settings-text-size-medium-aria')"
          >
            {{ $i18n('settings-text-size-medium') }}
          </cdx-radio>

          <cdx-radio 
            v-model="tempTextSize" 
            name="text-size" 
            input-value="large" 
            :aria-label="$i18n('settings-text-size-large')"
          >
            {{ $i18n('settings-text-size-large') }}
          </cdx-radio>

          <cdx-radio
            v-model="tempTextSize" 
            name="text-size" 
            input-value="extra-large" 
            :aria-label="$i18n('settings-text-size-extra-large')"
          >
            {{ $i18n('settings-text-size-extra-large') }}
          </cdx-radio>
        </cdx-field>
      </div>
    </cdx-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, getCurrentInstance} from "vue";
import {
  CdxMenuButton,
  CdxDialog,
  CdxField,
  CdxRadio,
  CdxIcon,
  CdxButton,
  CdxTextInput,
} from "@wikimedia/codex";
import {
  cdxIconMenu,
  cdxIconBright,
  cdxIconMoon,
  cdxIconLanguage,
  cdxIconSearch,
  cdxIconClose,
  cdxIconClear,
  cdxIconSearchCaseSensitive,
} from "@wikimedia/codex-icons";
import { DISPLAY_LANGUAGES } from '../i18n/displayLanguages';
import { getBrowserLanguage } from '../i18n/displayLanguages';
import { useSearchStore } from '../state/searchStore';

type Theme = 'auto' | 'light' | 'dark';
type TextSize = 'small' | 'medium' | 'large' | 'extra-large';
type MenuSelection = 'theme' | 'language' | 'textSize' | null;

const VALID_THEMES: Theme[] = ['auto', 'light', 'dark'];
const VALID_TEXT_SIZES: TextSize[] = ['small', 'medium', 'large', 'extra-large'];

function parseTheme(raw: string | null): Theme {
  return VALID_THEMES.includes(raw as Theme) ? (raw as Theme) : 'auto';
}

function parseTextSize(raw: string | null): TextSize {
  return VALID_TEXT_SIZES.includes(raw as TextSize) ? (raw as TextSize) : 'medium';
}

const instance = getCurrentInstance();
const store = useSearchStore();
const $i18n = instance?.appContext.config.globalProperties.$i18n as (key: string, ...params: unknown[]) => string;

const getLanguageName = (locale: string): string => {
  return DISPLAY_LANGUAGES.find(l => l.code === locale)?.nativeName || locale;
}

const selectedItem = ref<MenuSelection>(null);
const currentTheme = ref<Theme>("auto");
const currentLanguage = ref(localStorage.getItem('locale') || getBrowserLanguage());
const currentTextSize = ref<TextSize>(parseTextSize(localStorage.getItem('dustpan_text_size')));

const tempTheme = ref<Theme>("auto");
const tempLanguage = ref(currentLanguage.value);
const tempTextSize = ref<TextSize>(currentTextSize.value);

const showThemeDialog = ref(false);
const showLanguageDialog = ref(false);
const showTextSizeDialog = ref(false);

const languageSearchQuery = ref("");

const filteredLanguages = computed(() => {
  const query = languageSearchQuery.value.toLowerCase().trim();
  if (!query) return DISPLAY_LANGUAGES;
  
  return DISPLAY_LANGUAGES.filter(lang => 
    lang.nativeName.toLowerCase().includes(query) || 
    lang.code.toLowerCase().includes(query)
  );
});

const themeLabel = computed(() => {
  const labels: Record<Theme, string> = {
    auto: $i18n('settings-theme-auto'),
    light: $i18n('settings-theme-light'),
    dark: $i18n('settings-theme-dark'),
  };
  return labels[currentTheme.value];
});

const languageLabel = computed(() => {
  const lang = DISPLAY_LANGUAGES.find(l => l.code === currentLanguage.value);
  return lang ? lang.nativeName : 'English';
});

const textSizeLabel = computed(() => {
  const labels: Record<TextSize, string> = {
    small: $i18n('settings-text-size-small'),
    medium: $i18n('settings-text-size-medium'),
    large: $i18n('settings-text-size-large'),
    'extra-large': $i18n('settings-text-size-extra-large'),
  };
  return labels[currentTextSize.value];
});

const effectiveTheme = computed(() => {
  if (currentTheme.value !== "auto") return currentTheme.value;
  return systemTheme.value;
});

const menuItems = computed(() => {
  return [
    {
      value: "theme",
      label: $i18n('settings-theme-label'),
      description: themeLabel.value,
      ariaLabel: `${$i18n('settings-theme-label')}: ${themeLabel.value}`,
      icon: effectiveTheme.value === "dark" ? cdxIconMoon : cdxIconBright,
    },
    {
      value: "language",
      label: $i18n('settings-language-label'),
      description: languageLabel.value,
      ariaLabel: `${$i18n('settings-language-label')}: ${languageLabel.value}`,
      icon: cdxIconLanguage,
    },
    {
      value: "textSize",
      label: $i18n('settings-text-size-label'),
      description: textSizeLabel.value,
      ariaLabel: `${$i18n('settings-text-size-label')}: ${textSizeLabel.value}`,
      icon: cdxIconSearchCaseSensitive,
    },
  ];
});

watch(selectedItem, (newValue) => {
  if (newValue === "theme") {
    tempTheme.value = currentTheme.value;
    showThemeDialog.value = true;
    selectedItem.value = null;
} else if (newValue === "language") {
  languageSearchQuery.value = "";
  tempLanguage.value = currentLanguage.value;
  showLanguageDialog.value = true;
  selectedItem.value = null;
} else if (newValue === "textSize") {
  tempTextSize.value = currentTextSize.value;
  showTextSizeDialog.value = true;
  selectedItem.value = null;
}
});

function saveTheme() {
  currentTheme.value = tempTheme.value;
  showThemeDialog.value = false;

  // save to localStorage
  localStorage.setItem("theme", tempTheme.value);

  // apply theme to html element
  applyTheme(tempTheme.value);
}

function restoreTheme() {
  const savedTheme = localStorage.getItem("theme");
  currentTheme.value = parseTheme(savedTheme);
  applyTheme(currentTheme.value);
}

function saveTextSize() {
  currentTextSize.value = tempTextSize.value;
  showTextSizeDialog.value = false;

  // save to localStorage
  localStorage.setItem("dustpan_text_size", tempTextSize.value);

  // apply text size to html element
  document.documentElement.setAttribute('font-size', tempTextSize.value);
}

function restoreTextSize() {
  const savedTextSize = parseTextSize(localStorage.getItem("dustpan_text_size"));
  currentTextSize.value = savedTextSize;
  document.documentElement.setAttribute('font-size', savedTextSize);
}

const systemTheme = ref<'dark' | 'light'>(
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
);

const hasThemeChanged = computed(() => {
  return tempTheme.value !== currentTheme.value;
});

const hasLanguageChanged = computed(() => {
  return tempLanguage.value !== currentLanguage.value;
});

onMounted(() => {
  restoreTheme();
  restoreTextSize();

  const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  darkModeQuery.addEventListener("change", (e) => {
    systemTheme.value = e.matches ? "dark" : "light";
    if (currentTheme.value === "auto") {
      applyTheme("auto");
    }
  });

  // WORKAROUND: Codex MenuButton keyboard accessibility issue
  // 
  // Problem: MenuButton blocks Space from reaching Menu's selection logic
  // - MenuButton.onKeydown returns early for Space keys
  // - This prevents Menu.delegateKeyNavigation from handling selection
  // - Note: Enter and Tab are working fine now.
  // 
  // Impact: Keyboard users can navigate menu but can't select with Space
  // 
  // This listener catches Space when menu is expanded and manually triggers
  // the dialogs, replicating what Menu.handleKeyNavigation should do.
  // 
  // TODO: Remove this once Codex fixes MenuButton to delegate Space to Menu
  // Related: https://github.com/wikimedia/design-codex/commit/f6c7f1f330cc050cb67a2d9a61d81f2ca85eb121

  document.addEventListener('keydown', (e) => {
    if (e.key !== ' ') return;

    const target = e.target as HTMLElement | null;
    const button = target?.closest('button[aria-haspopup="menu"]');
    if (!button) return;
    
    const isExpanded = button.getAttribute('aria-expanded') === 'true';
    if (!isExpanded) return;
    
    const menuId = button.getAttribute('aria-controls');
    const menu = menuId ? document.getElementById(menuId) : null;
    if (!menu) return;
    
    const highlighted = menu.querySelector('.cdx-menu-item--highlighted');
    if (!highlighted) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const menuItemsList = Array.from(menu.querySelectorAll('.cdx-menu-item'));
    const highlightedIndex = menuItemsList.indexOf(highlighted);

    if (highlightedIndex === 0) { 
      tempTheme.value = currentTheme.value;
      showThemeDialog.value = true;
      selectedItem.value = null;
    } else if (highlightedIndex === 1) { 
      languageSearchQuery.value = "";
      tempLanguage.value = currentLanguage.value;
      showLanguageDialog.value = true;
      selectedItem.value = null;
    } else if (highlightedIndex === 2) {
      tempTextSize.value = currentTextSize.value;
      showTextSizeDialog.value = true;
      selectedItem.value = null;
    }
  }, true);
});

function applyTheme(theme: Theme) {
  const html = document.documentElement;

  if (theme === "dark") {
    html.classList.remove("light");
    html.classList.add("dark");
  } else if (theme === "light") {
    html.classList.remove("dark");
    html.classList.add("light");
  } else {
    // auto
    html.classList.remove("dark", "light");
    // check system preference and apply it
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      html.classList.add("dark");
    }
  }
}

function saveLanguage() {
  currentLanguage.value = tempLanguage.value; 
  
  const newLangName = getLanguageName(currentLanguage.value);
  
  localStorage.setItem('locale', currentLanguage.value);
  localStorage.setItem('language_change_toast', newLangName);
  if (store.currentView === 'search') {
    localStorage.setItem('dustpan_skip_requery', 'true');
  }
  window.location.reload();
}
</script>

<style scoped>
.settings-menu {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

:deep(.cdx-menu-button) {
  margin: 0 !important;
  display: inline-flex;
  align-items: center;
}

.error-message :deep(.cdx-message__content) {
    line-height: var(--line-height-small);
    font-family: var(--font-family-system-sans);
}
.dialog-content {
  font-family: var(--font-family-system-sans);
}

.settings-dialog__header-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-75);
  width: 100%;
}

.settings-dialog__search {
  flex: 1 1 auto;
}


.settings-dialog__body :deep(.cdx-radio__label) {
    font-family: var(--font-family-system-sans);
}

.no-results {
  color: var(--color-subtle);
  line-height: var(--line-height-small);
  font-family: var(--font-family-system-sans);
}

.settings-menu {
  display: flex;
  align-items: center;
}

.dialog-content {
  color: var(--color-base);
  margin-bottom: calc(var(--spacing-50) - var(--spacing-100));
}

.radio-description {
  color: var(--color-subtle);
  font-family: var(--font-family-system-sans);
}

.translate-help {
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
}

.translate-link {
  color: var(--color-progressive);
  text-decoration: none;
}

.settings-dialog__header-content .cdx-button {
    margin-inline-end: calc(var(--spacing-50) * -1);
}
</style>
