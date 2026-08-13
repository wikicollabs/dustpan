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
          <div v-if="isLoading" class="loading-state" role="status" aria-live="assertive">
            <h3>{{ $i18n('results-querying') }}</h3>
            <CdxProgressBar :aria-label="$i18n('results-querying-aria')" aria-hidden="true" />
          </div>

          <CdxMessage v-else-if="error" type="error">
            {{ error }}
          </CdxMessage>

          <div v-else>
            <CdxMessage
              v-if="contributionInfo"
              type="notice"
              :icon="cdxIconLightbulb"
              :allow-user-dismiss="false"
              class="contribution-info-message"
            >
              <div
                class="contribution-info-content"
                role="button"
                tabindex="0"
                :aria-expanded="!isContributionInfoCollapsed"
                :aria-label="isContributionInfoCollapsed ? $i18n('contribution-info-expand-aria') : $i18n('contribution-info-collapse-aria')"
                @click="toggleContributionInfo"
                @keydown.enter="toggleContributionInfo"
                @keydown.space.prevent="toggleContributionInfo"
              >
                <div class="contribution-info-text-column">
                  <span class="contribution-info-text">
                    {{ isContributionInfoCollapsed
                      ? $i18n(contributionInfo.summaryLabel, contributionInfo.property ?? '')
                      : $i18n(contributionInfo.detailsLabel, contributionInfo.property ?? '') }}
                  </span>

                  <div
                    v-if="!isContributionInfoCollapsed && contributionInfo.example"
                    class="contribution-info-example"
                  >
                    <div class="contribution-info-example-label">{{ $i18n('contribution-info-example-label') }}</div>
                    <div class="contribution-info-example-text">
                      <div class="contribution-info-example-subject-line">
                        <a
                          v-if="contributionInfo.example.qid"
                          :href="`https://www.wikidata.org/wiki/${contributionInfo.example.qid}`"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="contribution-info-example-subject-link"
                          :aria-label="$i18n('contribution-info-example-link-aria', contributionInfo.example.subject, contributionInfo.example.qid)"
                        >{{ contributionInfo.example.subject }} ({{ contributionInfo.example.qid }})</a>
                        <template v-else>{{ contributionInfo.example.subject }}</template>
                      </div>
                      <div class="contribution-info-example-property-line">
                        {{ contributionInfo.example.property }} = {{ contributionInfo.example.value }}
                      </div>
                    </div>
                  </div>
                </div>

                <CdxIcon
                  :icon="isContributionInfoCollapsed ? cdxIconExpand : cdxIconCollapse"
                  class="contribution-info-icon"
                />
              </div>
            </CdxMessage>

            <ResultsTable
              :results="filteredResults"
              :total-count="results.length"
              :connection-error="connectionError"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, getCurrentInstance } from "vue";
import { CdxButton, CdxIcon, CdxProgressBar, CdxMessage, CdxTextInput } from "@wikimedia/codex";
import { cdxIconCollapse, cdxIconExpand, cdxIconFunnel, cdxIconLinkExternal, cdxIconLightbulb } from "@wikimedia/codex-icons";
import SearchPanel from "../components/SearchPanel.vue";
import ResultsTable from "../components/ResultsTable.vue";
import { getQueryOptionsForProject, getQueryContributionInfo, getWikiprojectName, getWikiprojectUrl } from "../query/queries";
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

const filteredResults = computed(() => {
  if (!textFilter.value) return results.value;
  const search = textFilter.value.toLowerCase();
  return results.value.filter(
    (r) =>
      r.label.toLowerCase().includes(search) ||
      r.itemId.toLowerCase().includes(search)
  );
});

const activeFilterCount = computed(() => (textFilter.value ? 1 : 0));

const hasActiveFilters = computed(() => textFilter.value.trim() !== "");

function clearFilters() {
  textFilter.value = "";
}

const isContributionInfoCollapsed = ref(true);
const contributionInfo = computed(() => searchedQueryId.value ? getQueryContributionInfo(searchedQueryId.value) : null);

function toggleContributionInfo() {
  isContributionInfoCollapsed.value = !isContributionInfoCollapsed.value;
}

function getQueryLabel(queryValue: string | null): string {
  if (!queryValue) return "";
  const options = getQueryOptionsForProject(searchedWikiproject.value);
  const found = options.find((q) => q.value === queryValue);
  return found ? $i18n(found.label) : queryValue;
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
  gap: var(--spacing-25);
  text-decoration: none;
  font-family: var(--font-family-base);
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

.loading-state {
  padding: var(--spacing-100);
  border: 0.0625rem solid var(--border-color-base);
  border-radius: var(--border-radius-base);
  width: 100%;
}

.loading-state h3 {
  margin: 0 0 var(--spacing-100) 0;
  color: var(--color-emphasized);
  text-align: center;
}

.loading-state :deep(.cdx-progress-bar__bar) {
  background-color: var(--background-color-progressive) !important;
}

@media (min-width: 1024px) {
  .loading-state :deep(.cdx-progress-bar) {
    max-width: 32rem;
    margin: 0 auto;
  }
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

.category-filter-error {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-50);
  color: var(--color-error);
  font-size: var(--font-size-medium);
  font-weight: 400 !important;
  margin-top: var(--spacing-25);
}

.category-filter-error :deep(.cdx-icon) {
  margin-top: 2px;
  color: var(--color-error);
  width: 20px;
  height: 20px;
  min-width: 20px;
}

.category-filter-error :deep(.cdx-message__content) {
  margin-left: 0;
  line-height: var(--line-height-small);
}

.contribution-info-message {
  margin-bottom: var(--spacing-100);
}

.contribution-info-message :deep(.cdx-message__content) {
  margin-left: 0;
  width: 100%;
}

.contribution-info-content {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-75);
  cursor: pointer;
  width: 100%;
  line-height: var(--line-height-small) !important;
}

.contribution-info-text {
  color: var(--color-base);
  white-space: pre-line;
}

.contribution-info-text-column {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.contribution-info-example {
  margin-top: var(--spacing-100);
}
.contribution-info-example-label {
  font-weight: 700;
}

.contribution-info-icon {
  flex-shrink: 0;
  color: var(--color-notice);
}

.contribution-info-message :deep(.cdx-message__icon--vue) {
  width: var(--Components-Icon-medium, 1.25rem);
  height: var(--Components-Icon-medium, 1.25rem);
  flex-shrink: 0;
  aspect-ratio: 1/1;
  margin-inline-end: var(--spacing-50);
  margin-top: calc((var(--line-height-small) - 1.125rem) / 2);
}

.contribution-info-example-subject-link {
  color: var(--color-progressive);
  font-weight: 700;
  text-decoration: none;
}

.contribution-info-example-subject-link:hover {
  text-decoration: underline;
}

</style>