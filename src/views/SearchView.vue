<!--
  SPDX-License-Identifier: GPL-2.0-or-later

  Dustpan
  A tool to uncover WikiProjects that can be improved on Wikidata
  @see https://github.com/wikicollabs/dustpan
-->

<template>
  <div class="search-view">
    <div class="search-content">
      <div class="header-row">
        <CdxButton
          v-show="isPanelCollapsed"
          @click="isPanelCollapsed = false"
          class="expand-button"
          :aria-label="activeFilterCount > 0
            ? $i18n('search-show-panel-aria-with-filters', activeFilterCount)
            : $i18n('search-show-panel-aria')"
        >
          <CdxIcon :icon="cdxIconExpand" />
          {{ activeFilterCount > 0
              ? `${$i18n('search-show-panel')} (${activeFilterCount})`
              : $i18n('search-show-panel') }}
        </CdxButton>
        <div class="header-titles">
          <h1>{{ getQueryLabel(searchedQueryId) }}</h1>
          <a
            :href="getWikiprojectUrl(searchedWikiproject)"
            target="_blank"
            rel="noopener noreferrer"
            class="wikiproject-link"
            :aria-label="$i18n('wikiproject-link-aria-label', getWikiprojectLabel(searchedWikiproject))">
            <span class="wikiproject-text" dir="ltr">WikiProject <bdi>{{ getWikiprojectLabel(searchedWikiproject) }}</bdi></span>
            <CdxIcon :icon="cdxIconLinkExternal" /></a>
        </div>
      </div>

      <div class="search-layout">
        <div v-show="!isPanelCollapsed" class="results-search-panel">
          <div class="search-header">
            <h3 class="search-heading">{{ $i18n('search-heading') }}</h3>
            <CdxButton
              @click="collapsePanel"
              class="collapse-button"
              :aria-label="$i18n('search-hide-panel-aria')"
            >
              <CdxIcon :icon="cdxIconCollapse" />
            </CdxButton>
          </div>

          <SearchPanel
            :wikiproject="wikiproject"
            :query-id="queryId"
            :scope="scope"
            :scope-initial-value="scopeInitialValue"
            :scope-options-map="scopeOptionsMap"
            :disabled="disabled"
            :results-exist="results.length > 0"
            :search-has-run="!!searchedQueryId"
            :active-filter-count="activeFilterCount"
            @update:wikiproject="$emit('update:wikiproject', $event)"
            @update:query-id="$emit('update:query-id', $event)"
            @update:scope="$emit('update:scope', $event)"
            @search="handleSearch"
          />

          <div v-if="results.length > 0" class="filter-divider"></div>

          <div v-if="results.length > 0" class="filters-section">
            <div class="filters-header">
              <h3>{{ $i18n('filters-heading') }}{{ activeFilterCount > 0 ? ` (${activeFilterCount})` : '' }}</h3>
              <CdxButton
                weight="quiet"
                :disabled="!hasActiveFilters"
                :aria-disabled="!hasActiveFilters"
                :aria-label="$i18n('filters-clear-all')"
                @click="clearFilters"
                class="clear-filters-button"
              >
                {{ $i18n('filters-clear-all') }}
              </CdxButton>
            </div>

            <div class="filters-controls">
              <CdxTextInput
                v-model="textFilter"
                input-type="search"
                :start-icon="cdxIconFunnel"
                :clearable="true"
                :placeholder="$i18n('filters-text-placeholder')"
                :aria-label="$i18n('filters-text-label-aria')"
              />
            </div>
          </div>
        </div>

        <div class="results-area">
          <ResultsPanel
            :is-loading="isLoading"
            :error="error"
            :connection-error="connectionError"
            :results="results"
            :text-filter="textFilter"
            :searched-wikiproject="searchedWikiproject"
            :searched-query-id="searchedQueryId"
            :searched-scope="searchedScope"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, getCurrentInstance } from "vue";
import { CdxButton, CdxIcon, CdxTextInput } from "@wikimedia/codex";
import { cdxIconCollapse, cdxIconExpand, cdxIconFunnel, cdxIconLinkExternal, cdxIconLightbulb } from "@wikimedia/codex-icons";
import SearchPanel from "../components/SearchPanel.vue";
import ResultsPanel from "../components/results/ResultsPanel.vue";
import { getQueryOptionsForProject, getWikiprojectName, getWikiprojectUrl } from "../query/queries";
import type { SearchResultItem } from "../state/searchStore";
import type { ScopeOption } from "../types/types";

const instance = getCurrentInstance();
const $i18n = instance?.appContext.config.globalProperties.$i18n as (key: string, ...params: unknown[]) => string;

const props = withDefaults(defineProps<{
  wikiproject?: string | null;
  queryId?: string | null;
  scope?: string | null;
  // one-shot value resolved from the URL by App.vue on mount/popstate.
  // passthrough down to SearchPanel -> ScopeSelect's initial-value.
  scopeInitialValue?: string | null;
  scopeOptionsMap?: Record<string, ScopeOption[] | null>;
  disabled?: boolean;
  searchedWikiproject?: string | null;
  searchedQueryId?: string | null;
  searchedScope?: string | null;
  results?: SearchResultItem[];
  isLoading?: boolean;
  error?: string | null;
  connectionError?: boolean;
}>(), {
  wikiproject: null,
  queryId: null,
  scope: null,
  scopeInitialValue: null,
  scopeOptionsMap: () => ({}),
  disabled: false,
  searchedWikiproject: null,
  searchedQueryId: null,
  searchedScope: null,
  results: () => [],
  isLoading: false,
  error: null,
  connectionError: false,
});

const emit = defineEmits<{
  "update:wikiproject": [value: string | null];
  "update:query-id": [value: string | null];
  "update:scope": [value: string | null];
  search: [];
}>();

const isPanelCollapsed = ref(false);
const textFilter = ref("");

const results = computed(() => props.results);
const isLoading = computed(() => props.isLoading);
const error = computed(() => props.error);
const connectionError = computed(() => props.connectionError);
const searchedWikiproject = computed(() => props.searchedWikiproject);
const searchedQueryId = computed(() => props.searchedQueryId);
const searchedScope = computed(() => props.searchedScope);
onMounted(() => {
  isPanelCollapsed.value = window.innerWidth < 640;
});

function handleSearch() {
  isPanelCollapsed.value = window.innerWidth < 640;
  textFilter.value = "";
  emit("search");
}

function collapsePanel() {
  // blur any focused element inside the search panel
  if (document.activeElement) {
    (document.activeElement as HTMLElement).blur();
  }
  isPanelCollapsed.value = true;
}

const activeFilterCount = computed(() => (textFilter.value ? 1 : 0));

const hasActiveFilters = computed(() => textFilter.value.trim() !== "");

function clearFilters() {
  textFilter.value = "";
}

function getQueryLabel(queryValue: string | null): string {
  if (!queryValue) return "";
  const options = getQueryOptionsForProject(searchedWikiproject.value);
  const found = options.find((q) => q.value === queryValue);
  return found ? $i18n(found.label, found.property ?? "") : queryValue;
}

function getWikiprojectLabel(projectValue: string | null): string {
  if (!projectValue) return "";
  return getWikiprojectName(projectValue);
}
</script>

<style scoped>
/* SEARCH VIEW - MOBILE FIRST */
.search-view {
  padding: var(--spacing-100);
  flex: 1;
}

.search-content {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.header-row {
  display: flex;
  flex-direction: column-reverse; /* stack on mobile */
  align-items: flex-start; /* align to left */
  gap: var(--spacing-100);
}

/* DESKTOP */
@media (min-width: 1024px) {
  .header-row {
    flex-direction: row;
    align-items: center;
  }

  .header-row .header-titles {
    flex: 1; /* wrapper takes remaining space next to the expand button */
  }
}

.search-content h1 {
  color: var(--color-emphasized);
  font-family: var(--font-family-serif);
  font-size: var(--font-size-xxx-large);
  font-weight: 400;
  line-height: var(--line-height-xxx-large);
  font-style: normal;
  margin: 0;
  width: 100%; /* full width on mobile */
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
  width: 100%;
}

.wikiproject-link {
  color: var(--color-progressive);
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: var(--spacing-25);
  text-decoration: none;
  font-family: var(--font-family-system-sans);
  font-size: var(--font-size-medium);
  font-style: normal;
  font-weight: 700;
  line-height: var(--line-height-small);
}

.wikiproject-text {
  unicode-bidi: isolate;
}


.wikiproject-link:hover {
  text-decoration: underline;
}

.wikiproject-link :deep(.cdx-icon) {
  color: var(--color-progressive);
  font-size: 0.875rem;
}

.search-layout {
  margin-top: var(--spacing-75);
  width: 100%;
  display: flex;
  flex-direction: column; /* stack on mobile */
  align-items: flex-start;
  gap: var(--spacing-100);
}

.search-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-75);
}

.search-heading {
  margin: 0;
  color: var(--color-emphasized);
  font-weight: 700;
}

/* search results page search panel */
.results-search-panel {
  width: 100%;
  background-color: var(--background-color-interactive);
  border: 0.0625rem solid var(--border-color-base);
  border-radius: var(--border-radius-base);
  padding: var(--spacing-75);
}

.results-search-panel :deep(.cdx-field) {
  margin-bottom: 0;
}

.results-area {
  flex: 1;
  min-width: 0;
  width: 100%;
}

.collapse-button {
  width: var(--size-200);
  height: var(--size-200);
}

.collapse-button,
.expand-button {
  background-color: var(--background-color-interactive-subtle) !important;
  border: 1px solid var(--border-color-interactive) !important;
}

.expand-button {
  width: 100% !important;
  max-width: none !important;
  font-size: var(--font-size-medium);
  line-height: var(--line-height-small);
  font-weight: 700;
}

@media (min-width: 1024px) {
  .expand-button {
    width: auto !important;
    max-width: none !important;
    white-space: nowrap !important;
    padding: var(--spacing-25) var(--spacing-75) !important;
    flex-shrink: 0;
  }
}

/* SEARCH VIEW - TABLET PORTRAIT */
@media (min-width: 640px) and (max-width: 1023px) {
  .search-view {
    padding: var(--spacing-200); /* 32px on tablet */
  }

  .search-layout {
    flex-direction: column; /* vertical stack like mobile */
    gap: var(--spacing-100); /* 24px gutter */
  }

  .results-search-panel {
    width: 100%; /* full width in vertical layout */
  }
}

/* SEARCH VIEW - DESKTOP */
@media (min-width: 1024px) {
  .search-view {
    padding: var(--spacing-200); /* 32px on desktop */
  }

  .search-layout {
    flex-direction: row; /* side-by-side on desktop */
    gap: var(--spacing-100); /* 24px gutter */
    min-height: 25.5rem;
  }

  .results-search-panel {
    width: 24rem;
    max-width: 24rem;
  }
}

.filter-divider {
  width: 100%;
  height: 0.0625rem;
  background-color: var(--border-color-base);
  margin-top: var(--spacing-75);
  margin-bottom: var(--spacing-75);
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-75);
}

.filters-header h3 {
  margin: 0;
  font-size: var(--font-size-large);
  font-weight: 700;
  color: var(--color-emphasized);
}

.clear-filters-button {
  border-radius: var(--border-radius-base);
  border: 0.0625rem solid var(--border-color-interactive) !important;
  background-color: var(--background-color-interactive-subtle) !important;
  color: var(--color-base) !important;
  font-size: var(--font-size-medium);
  font-weight: 700;
  line-height: var(--line-height-small);
  font-family: var(--font-family-system-sans);
}

.clear-filters-button:disabled {
  border: 0.0625rem solid var(--border-color-transparent) !important;
  background-color: var(--background-color-disabled) !important;
  color: var(--color-disabled) !important;
  cursor: not-allowed;
}

.filters-controls :deep(.cdx-label) {
  padding-bottom: var(--spacing-25);
}

.filters-controls :deep(.cdx-label__label__text) {
  overflow: visible;
  text-overflow: ellipsis;
}

</style>