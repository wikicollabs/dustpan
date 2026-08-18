<!--
  SPDX-License-Identifier: GPL-2.0-or-later

  Dustpan
  A tool to uncover WikiProjects that can be improved on Wikidata
  @see https://github.com/wikicollabs/dustpan
-->

<template>
  <div class="landing-view">
    <div class="body-frame">
      <section class="section-text">
        <h1>{{ $i18n('landing-dustpan-tagline') }}</h1>
        <p class="subtitle">{{ $i18n('landing-dustpan-subtitle') }}</p>
        <!-- Broomstick Information -->
        <div class="divider"></div>
        <div class="broomstick-message">
          <BroomstickIcon aria-hidden="true" />
          <span class="broomstick-content">
            <a
              href="https://broomstick.toolforge.org/"
              target="_blank"
              rel="noopener noreferrer"
              class="broomstick-link"
              :aria-label="$i18n('landing-improve-lexemes-link')"
            >{{ $i18n('landing-improve-lexemes-link') }}</a>{{ $i18n('landing-improve-lexemes-help') }}
          </span>
        </div>
      </section>
      <section class="section-form">
        <div class="landing-search-panel">
          <SearchPanel
            :wikiproject="wikiproject"
            :query-id="queryId"
            :scope="scope"
            :scope-initial-value="scopeInitialValue"
            :scope-options-map="scopeOptionsMap"
            :disabled="disabled"
            @update:wikiproject="$emit('update:wikiproject', $event)"
            @update:query-id="$emit('update:query-id', $event)"
            @update:scope="$emit('update:scope', $event)"
            @search="$emit('search')"
          />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getCurrentInstance } from "vue";
import SearchPanel from "../components/SearchPanel.vue";
import BroomstickIcon from "../components/icons/BroomstickIcon.vue";
import type { ScopeOption } from "../types/types";

const instance = getCurrentInstance();
const $i18n = instance?.appContext.config.globalProperties.$i18n as (key: string, ...params: unknown[]) => string;

withDefaults(defineProps<{
  wikiproject?: string | null;
  queryId?: string | null;
  scope?: string | null;
  // one-shot value resolved from the URL by App.vue on mount/popstate.
  // passthrough down to SearchPanel -> ScopeSelect's initial-value.
  scopeInitialValue?: string | null;
  scopeOptionsMap?: Record<string, ScopeOption[] | null>;
  disabled?: boolean;
}>(), {
  wikiproject: null,
  queryId: null,
  scope: null,
  scopeInitialValue: null,
  scopeOptionsMap: () => ({}),
  disabled: false,
});

defineEmits<{
  "update:wikiproject": [value: string | null];
  "update:query-id": [value: string | null];
  "update:scope": [value: string | null];
  search: [];
}>();



</script>

<style scoped>
/* MOBILE FIRST */
.landing-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-100);
  flex: 1;
}

.body-frame {
  width: 100%;
  max-width: calc(100vw - 2 * var(--spacing-100));
  display: flex;
  flex-direction: column; /* stack vertically on mobile */
  gap: var(--spacing-100);
}

.section-text {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.section-form {
  width: 100%;
}

.landing-view h1 {
  font-family: var(--font-family-serif);
  font-size: 1.625rem;
  font-weight: 400;
  line-height: var(--line-height-xxx-large);
  color: var(--color-emphasized);
  margin: 0 0 var(--spacing-50) 0;
}

.subtitle {
  font-size: var(--font-size-medium);
  margin: 0;
}

.divider {
  display: flex;              
  flex-direction: column;     
  align-items: flex-start;    
  gap: 0.625rem;               
  align-self: stretch;
  width: 100%;
  max-width: 100%;
  padding: 0.25rem 0;        
  margin-top: var(--spacing-50);
  margin-bottom: var(--spacing-50);
}

.divider::before {
  content: "";
  display: block;
  align-self: stretch;
  height: 0;
  border-bottom: 1px solid var(--border-color-base);
}

.broomstick-content {
  color: var(--color-base);
}

.broomstick-message {
  display: flex;
  align-items: flex-start;
  align-self: flex-start;
  gap: var(--spacing-50);
  line-height: var(--line-height-medium);
}

.broomstick-message :deep(svg) {
  width: calc(var(--font-size-medium, 1rem) + 4px);
  height: var(--line-height-medium, 1.625rem);
  flex-shrink: 0;
  color: #3056A9;
}

.broomstick-link {
  color: var(--color-progressive);
  text-decoration: none;
}

.landing-search-panel {
  width: 100%;
  box-sizing: border-box; /* includes padding/border in width */
  background-color: var(--background-color-interactive);
  border: 0.0625rem solid var(--border-color-base);
  border-radius: var(--border-radius-base);
  padding: var(--spacing-75);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
}

/* LANDING VIEW - TABLET PORTRAIT */
@media (min-width: 640px) and (max-width: 1023px) {
  .landing-view {
    padding: var(--spacing-200); /* 32px padding */
  }

  .body-frame {
    justify-content: flex-start; /* top-align instead of center */
    gap: var(--spacing-200); /* 32px between h1 section and search panel */
  }

  .section-text {
    width: 100%;
  }

  .section-form {
    width: 100%;
  }
}

/* LANDING VIEW - DESKTOP */
@media (min-width: 1024px) {
  .landing-view {
    padding: var(--spacing-200);
  }

  .body-frame {
    max-width: 56rem;
    flex-direction: row; /* side-by-side */
    gap: var(--spacing-150);
  }

  .section-text {
    width: 30rem;
  }

  .section-form {
    width: 24rem;
  }
}
</style>