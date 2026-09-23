<!--
  SPDX-License-Identifier: GPL-2.0-or-later

  Dustpan - Results Panel
  A tool to uncover WikiProjects that can be improved on Wikidata
  @see https://github.com/wikicollabs/dustpan
-->

<template>
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
              ? $i18n(contributionInfo.summaryLabel, contributionInfo.property)
              : $i18n(contributionInfo.detailsLabel, contributionInfo.property) }}
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
      :text-filter="textFilter"
      :searched-wikiproject="searchedWikiproject"
      :searched-query-id="searchedQueryId"
      :searched-scope="searchedScope"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, getCurrentInstance } from "vue";
import { CdxMessage, CdxProgressBar, CdxIcon } from "@wikimedia/codex";
import { cdxIconExpand, cdxIconCollapse, cdxIconLightbulb } from "@wikimedia/codex-icons";
import ResultsTable from "./ResultsTable.vue";
import { getQueryContributionInfo } from "../../query/queries";
import type { SearchResultItem } from "../../state/searchStore";

const instance = getCurrentInstance();
const $i18n = instance?.appContext.config.globalProperties.$i18n as (key: string, ...params: unknown[]) => string;

const props = withDefaults(defineProps<{
  isLoading?: boolean;
  error?: string | null;
  connectionError?: boolean;
  results?: SearchResultItem[];
  textFilter?: string;
  searchedWikiproject?: string | null;
  searchedQueryId?: string | null;
  searchedScope?: string | null;
}>(), {
  isLoading: false,
  error: null,
  connectionError: false,
  results: () => [],
  textFilter: "",
  searchedWikiproject: null,
  searchedQueryId: null,
  searchedScope: null,
});

const filteredResults = computed(() => {
  if (!props.textFilter) return props.results;
  const search = props.textFilter.toLowerCase();
  return props.results.filter(
    (r) =>
      r.label.toLowerCase().includes(search) ||
      r.itemId.toLowerCase().includes(search)
  );
});

const isContributionInfoCollapsed = ref(true);
const contributionInfo = computed(() =>
  props.searchedQueryId ? getQueryContributionInfo(props.searchedQueryId) : null
);

function toggleContributionInfo() {
  isContributionInfoCollapsed.value = !isContributionInfoCollapsed.value;
}
</script>

<style scoped>
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