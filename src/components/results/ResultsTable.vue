<!--
  SPDX-License-Identifier: GPL-2.0-or-later

  Dustpan
  A tool to uncover WikiProjects that can be improved on Wikidata
  @see https://github.com/wikicollabs/dustpan
-->

<template>
  <div
    class="results-wrapper"
    :class="{ 'all-hidden': allVisitedAndHidden, 'connection-error': props.connectionError }"
  >
    <CdxTable
      :caption="tableCaption"
      tabindex="-1"
      :columns="
        results.length === 0 ||
        allVisitedAndHidden ||
        props.connectionError
          ? []
          : columns
      "
      :data="tableData"
      :paginate="
        results.length > 0 &&
        !allVisitedAndHidden &&
        !props.connectionError
      "
      :pagination-size-options="paginationOptions"
      :pagination-size-default="200"
      v-model:sort="sortState"
      :use-row-headers="false"
    >
      <template #header>
        <ResultsVisibility
          ref="visibilityControlsRef"
          :visible="results.length > 0 && !props.connectionError"
          :hide-visited="hideVisited"
          :hidden-count="hiddenCount"
          :visibility-status-message="visibilityStatusMessage"
          @toggle="toggleHideVisited"
        />
      </template>

      <template #item-visited="{ row }">
        <CdxIcon
          v-if="isVisited(row.itemId)"
          :icon="cdxIconSuccess"
          size="medium"
          :style="{ color: 'var(--color-subtle)' }"
          class="visited-icon"
          data-visited="true"
          aria-hidden="true"
        />
        <CdxIcon
          v-else
          :icon="cdxIconNotBright"
          size="medium"
          :style="{ color: 'transparent' }"
          aria-hidden="true"
        />
      </template>

      <template #item-itemId="{ row }">
        <ResultsLink
          :item-id="row.itemId"
          :label="row.label"
          :is-visited="isVisited(row.itemId)"
          :text-filter="props.textFilter"
          @visit="markVisited"
        />
      </template>

      <template #item-label="{ row }">
        <HighlightedText :text="row.label" :filter="props.textFilter" />
      </template>

      <template #empty-state>
        <ResultsEmpty
          :connection-error="props.connectionError"
          :all-visited-hidden="allVisitedAndHidden"
          @reload="reloadPage"
        />
      </template>
    </CdxTable>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, getCurrentInstance, watch, nextTick, toRef } from "vue";
import { CdxTable, CdxIcon } from "@wikimedia/codex";
import { cdxIconSuccess, cdxIconNotBright } from "@wikimedia/codex-icons";
import type { TableColumn, TableSort } from "@wikimedia/codex";
import type { SearchResultItem } from "../../state/searchStore";
import { useVisitedItems } from "./composables/useVisitedItems";
import ResultsVisibility from "./ResultsVisibility.vue";
import ResultsLink from "./ResultsLink.vue";
import HighlightedText from "./HighlightedText.vue";
import ResultsEmpty from "./ResultsEmpty.vue";

const instance = getCurrentInstance();
const $i18n = instance?.appContext.config.globalProperties.$i18n as (key: string, ...params: unknown[]) => string;

const reloadPage = () => {
  window.location.reload();
};

const props = withDefaults(defineProps<{
  results: SearchResultItem[];
  totalCount: number;
  searchedWikiproject?: string | null;
  searchedQueryId?: string | null;
  searchedScope?: string | null;
  textFilter?: string;
  connectionError?: boolean;
}>(), {
  textFilter: "",
  connectionError: false,
  searchedWikiproject: null,
  searchedQueryId: null,
  searchedScope: null,
});

const results = toRef(props, "results");

const sortState = ref<TableSort>({});
const visibilityControlsRef = ref<InstanceType<typeof ResultsVisibility> | null>(null);

const scopeKey = computed(() =>
  JSON.stringify([props.searchedWikiproject, props.searchedQueryId, props.searchedScope])
);

const {
  hideVisited,
  hiddenCount,
  filteredResults,
  allVisitedAndHidden,
  visibilityStatusMessage,
  markVisited,
  isVisited,
  toggleHideVisited,
  restoreFromStorage,
} = useVisitedItems(results, scopeKey, $i18n);
  
const columns = computed<TableColumn[]>(() => [
  {
    id: "visited",
    label: "",
    allowSort: false,
    width: "2.75rem",
    minWidth: "2.75rem",
  },
  {
    id: "itemId",
    label: $i18n('table-item-id-header'),
    allowSort: true,
    width: "12.5rem",
    minWidth: "12.5rem",
  },
  {
    id: "label",
    label: $i18n('table-label-header'),
    allowSort: true,
    minWidth: "12.5rem",
  },
]);

let rootObserver: MutationObserver | undefined;

onMounted(() => {
  restoreFromStorage();

  // add aria-label to visited column header after table renders
  const visitedHeader = document.querySelector(".cdx-table th:first-child");
  if (visitedHeader) {
    visitedHeader.setAttribute("aria-label", $i18n('table-visited-header'));
  }

  updateHeaderAriaLabels();
  updateRowsPerPageAriaLabel();

  const root = instance?.proxy?.$el as Element | undefined;
  if (root) {
    rootObserver = new MutationObserver(() => {
      updateHeaderAriaLabels();
      updateRowsPerPageAriaLabel();

      const header = document.querySelector(".cdx-table th:first-child");
      if (header && !header.hasAttribute("aria-label")) {
        header.setAttribute("aria-label", $i18n('table-visited-header'));
      }
    });
    rootObserver.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'aria-expanded'],
    });
  }
});

onBeforeUnmount(() => {
  rootObserver?.disconnect();
});

watch(sortState, updateHeaderAriaLabels, { deep: true });

const paginationOptions = [
  { value: 10 },
  { value: 50 },
  { value: 100 },
  { value: 200 },
  { value: 500 },
  { value: 1000 },
];

const tableCaption = computed(() => {
  if (props.connectionError) return '';
  const count = props.totalCount; // use total instead of filtered
  return $i18n('table-result-count', count, count);
});

// SearchResultItem (searchStore.ts) has no geographic field, so tableData
// doesn't include one either.
const tableData = computed(() => {
  let data: Array<{ visited: string; itemId: string; label: string }> = filteredResults.value.map((result) => ({
    visited: "",
    itemId: result.itemId,
    label: result.label,
  }));

  const sortColumn = Object.keys(sortState.value)[0];

  if (sortColumn) {
    const sortDirection = sortState.value[sortColumn];

    data = [...data].sort((a, b) => {
      // Hacky: CdxTable has no built-in numeric sort, it only tracks sort
      if (sortColumn === "itemId") {
        const aNum = parseInt(String(a[sortColumn as keyof typeof a]).replace(/\D/g, ""), 10);
        const bNum = parseInt(String(b[sortColumn as keyof typeof b]).replace(/\D/g, ""), 10);
        return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
      }

      const aVal = String(a[sortColumn as keyof typeof a]).toLowerCase();
      const bVal = String(b[sortColumn as keyof typeof b]).toLowerCase();

      if (sortDirection === "asc") {
        return aVal.localeCompare(bVal);
      } else {
        return bVal.localeCompare(aVal);
      }
    });
  }

  return data;
});

const qidSortAriaLabel = computed(() => {
  const sortColumn = Object.keys(sortState.value)[0];
  const sortOrder = sortColumn ? sortState.value[sortColumn] : null;
  
  if (sortColumn !== 'itemId') {
    return $i18n('table-header-qid-default');
  }
  return sortOrder === 'asc'
    ? $i18n('table-header-qid-ascending')
    : $i18n('table-header-qid-descending');
});

const labelSortAriaLabel = computed(() => {
  const sortColumn = Object.keys(sortState.value)[0];
  const sortOrder = sortColumn ? sortState.value[sortColumn] : null;
  
  if (sortColumn !== 'label') {
    return $i18n('table-header-label-default');
  }
  return sortOrder === 'asc'
    ? $i18n('table-header-label-ascending')
    : $i18n('table-header-label-descending');
});

function focusToggle(): void {
  visibilityControlsRef.value?.focus();
}

defineExpose({ focusToggle });

function updateHeaderAriaLabels() {
  nextTick(() => {
    const buttons = document.querySelectorAll(".cdx-table th button");
    if (buttons[0]) buttons[0].setAttribute("aria-label", qidSortAriaLabel.value);
    if (buttons[1]) buttons[1].setAttribute("aria-label", labelSortAriaLabel.value);
  });
}

function updateRowsPerPageAriaLabel() {
  nextTick(() => {
    const combobox = document.querySelector('.cdx-select-vue__handle[role="combobox"]');
    if (combobox) {
      const displayedText = combobox.querySelector('span span')?.textContent;
      if (displayedText) {
        combobox.setAttribute('aria-label', displayedText);
      }
    }
  });
}
</script>

<style scoped>
.results-wrapper {
  position: relative;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scroll-padding-top: 3.375rem;
}

@media (min-width: 640px) {
  .results-wrapper {
    scroll-padding-top: 4rem;
  }
}

/* only remove border when empty */
.results-wrapper :deep(.cdx-table__table__empty-state-content) {
  border: none !important;
  pointer-events: none !important;
  user-select: none !important;
  background-color: transparent !important;
}

.results-wrapper :deep(.cdx-table__table__empty-state-content:hover) {
  background-color: transparent !important;
}

:deep(.cdx-table__header) {
  height: 3.5rem;
  padding: var(--spacing-75) !important;
}

:deep(.cdx-table th) {
  padding: 0;
}

:deep(.cdx-table th button) {
  padding: var(--spacing-75);
}

/* disable ALL hover states when all items hidden */
.all-hidden :deep(tr:has(td:first-child .visited-icon):hover),
.all-hidden
  :deep(tr:has(td:first-child .visited-icon):hover td),
.all-hidden
  :deep(tbody tr:not(:has(td:first-child .visited-icon)):hover),
.all-hidden
  :deep(tbody tr:not(:has(td:first-child .visited-icon)):hover td) {
  background-color: var(--background-color-base) !important;
}

:deep(.cdx-table__table__empty-state-content) {
  white-space: normal !important;
  overflow-wrap: break-word !important;
  width: auto !important;
  max-width: 100% !important;
}

:deep(.cdx-table table) {
  table-layout: auto;
}

.results-wrapper.all-hidden {
  overflow-x: visible;
}

.results-wrapper.all-hidden :deep(.cdx-table table) {
  width: 100%;
}

:deep(.cdx-table td),
:deep(.cdx-table th) {
  white-space: nowrap; /* prevent vertical text wrapping */
}

/* desktop: allow label to wrap */
@media (min-width: 640px) {
  :deep(.cdx-table table) {
    width: 100%; /* table fills container on desktop */
  }

  :deep(.cdx-table td:nth-child(3)) {
    /* label column (3rd column) */
    white-space: normal;
  }
}

/* border on visited column */
:deep(td:first-child) {
  border-inline-end: 0.0625rem solid var(--border-color-base) !important;
}

/* visited row default state */
:deep(tr:has(td:first-child .visited-icon)) {
  background-color: var(--background-color-neutral) !important;
  color: var(--color-subtle) !important;
}

/* visited row hover state */
:deep(tr:has(td:first-child .visited-icon):hover) {
  background-color: var(--background-color-neutral-subtle) !important;
}

/* visited row hover - target td elements directly */
:deep(tr:has(td:first-child .visited-icon):hover td) {
  background-color: var(--background-color-neutral-subtle) !important;
}

/* NON-visited row hover state */
:deep(tbody tr:not(:has(td:first-child .cdx-icon[data-visited="true"])):hover) {
  background-color: var(--background-color-interactive-subtle) !important;
}

/* NON-visited row hover - target td elements */
:deep(tbody tr:not(:has(td:first-child .cdx-icon[data-visited="true"])):hover td) {
  background-color: var(--background-color-interactive-subtle) !important;
}

/* visited row links */
:deep(tr:has(td:first-child .visited-icon) a) {
  color: var(--color-visited) !important;
}

/* visited row link icons */
:deep(tr:has(td:first-child .visited-icon) a .cdx-icon) {
  color: var(--color-visited) !important;
}

/* visited row link hover underline */
:deep(tr:has(td:first-child .visited-icon) a:hover) {
  text-decoration: underline;
}

/* hide table header when showing connection error */
.results-wrapper.connection-error :deep(.cdx-table__header) {
  display: none !important;
}

.results-wrapper.connection-error :deep(.cdx-table thead) {
  display: none !important;
}

.results-wrapper.connection-error :deep(.cdx-table) {
  border-top: none !important;
}

/* only style button in connection error state */
.results-wrapper.connection-error :deep(.empty-state button) {
  align-self: center;
  margin-top: var(--spacing-75);
  pointer-events: auto;
  position: relative;
  z-index: 1;
}
</style>