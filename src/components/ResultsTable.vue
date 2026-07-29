<!--
  SPDX-License-Identifier: GPL-2.0-or-later

  Dustpan
  A tool to uncover WikiProjects that can be improved on Wikidata
  @see https://github.com/wikicollabs/dustpan
-->

<template>
  <div class="results-wrapper" :class="{ 'all-hidden': allVisitedAndHidden, 'connection-error': props.connectionError  }">
    <CdxTable
      :caption="tableCaption"
      tabindex="-1"
      :columns="
        results.length === 0 ||
        (hideVisited && filteredResults.length === 0) ||
          props.connectionError
          ? []
          : columns
      "
      :data="tableData"
      :paginate="
        results.length > 0 &&
        !(hideVisited && filteredResults.length === 0) &&
        !props.connectionError
      "
      :pagination-size-options="paginationOptions"
      :pagination-size-default="200"
      v-model:sort="sortState"
      :use-row-headers="false"
    >
    <template #header>
        <div v-if="results.length > 0 && !props.connectionError" class="visibility-controls">
      <span v-if="hideVisited" class="hidden-count">
        {{ $i18n('table-hidden-count', hiddenCount) }}
      </span>
      <CdxButton
        class="visibility-toggle"
        :class="{ 'is-hidden': hideVisited }"
        action="progressive"
        weight="quiet"
        :aria-label="`${$i18n('table-hide-visited-aria')} ${hideVisited ? $i18n('state-on') : $i18n('state-off')}`"
        :aria-pressed="hideVisited"
        @click="toggleHideVisited"
      >
        <CdxIcon :icon="hideVisited ? cdxIconEyeClosed : cdxIconEye" />
        <span class="toggle-text">{{ $i18n('table-hide-visited') }}</span>
      </CdxButton>
    </div>

    <div 
        class="visually-hidden" 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
      >
        {{ visibilityStatusMessage }}
      </div>
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
  <a
    :href="`https://www.wikidata.org/wiki/${row.itemId}`"
    target="_blank"
    rel="noopener"
    class="external-link"
    @click.stop="markVisited(row.itemId)"
  >
    {{ row.itemId }}
    <CdxIcon :icon="cdxIconLinkExternal" class="external-icon" />
  </a>
</template>

<template #empty-state>
  <div class="empty-state" role="status" aria-live="polite">
    <template v-if="props.connectionError">
      <h3>{{ $i18n('errors-unable-to-connect') }}</h3>
      <p>{{ $i18n('errors-reload-prompt') }}</p>
      <CdxButton 
        action="progressive" 
        weight="primary"
        @click="reloadPage"
        :aria-label="$i18n('errors-reload-page')"
      >
        {{ $i18n('errors-reload-page') }}
      </CdxButton>
    </template>
    <template v-else-if="hideVisited && filteredResults.length === 0">
      <p>{{ $i18n('table-all-visited') }}</p>
    </template>
    <template v-else>
      <p>{{ $i18n('table-no-results') }}</p>
      <p>{{ $i18n('table-try-query') }}</p>
    </template>
  </div>
</template>
    </CdxTable>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, getCurrentInstance, watch, nextTick } from "vue";
import { CdxTable, CdxIcon, CdxButton } from "@wikimedia/codex";
import type { TableColumn, TableSort } from "@wikimedia/codex";
import {
  cdxIconLinkExternal,
  cdxIconSuccess,
  cdxIconEye,
  cdxIconEyeClosed,
  cdxIconNotBright,
} from "@wikimedia/codex-icons";
import type { SearchResultItem } from "../state/searchStore";

const instance = getCurrentInstance();
const $i18n = instance?.appContext.config.globalProperties.$i18n as (key: string, ...params: unknown[]) => string;

const reloadPage = () => {
  window.location.reload();
};

const props = withDefaults(defineProps<{
  results: SearchResultItem[];
  totalCount: number;
  connectionError?: boolean;
}>(), {
  connectionError: false,
});

const sortState = ref<TableSort>({});
const visitedItems = ref<Set<string>>(new Set());
const hideVisited = ref(false);

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
  // {
  //   id: "geographic",
  //   label: $i18n('table-geographic-header'),
  //   allowSort: true,
  //   minWidth: "10rem",
  // },
]);

onMounted(() => {
// restore from sessionStorage
const savedVisited = sessionStorage.getItem('dustpan_visited');
if (savedVisited) {
  visitedItems.value = new Set(JSON.parse(savedVisited));
}

const savedHideVisited = sessionStorage.getItem('dustpan_hide_visited');
if (savedHideVisited) {
  hideVisited.value = savedHideVisited === 'true';
}

  // add aria-label to visited column header after table renders
  const visitedHeader = document.querySelector(".cdx-table th:first-child");
  if (visitedHeader) {
    visitedHeader.setAttribute("aria-label", $i18n('table-visited-header'));
  }

  updateHeaderAriaLabels();
  updateRowsPerPageAriaLabel();

  // watch for dropdown state changes to update aria-label
  const selectWrapper = document.querySelector('.cdx-select-vue');
  if (selectWrapper) {
    const observer = new MutationObserver(() => {
      updateRowsPerPageAriaLabel();
    });
    observer.observe(selectWrapper, { attributes: true, attributeFilter: ['class'] });
  }
});

// save to sessionStorage on changes
watch(visitedItems, (newSet) => {
  sessionStorage.setItem('dustpan_visited', JSON.stringify([...newSet]));
}, { deep: true });

watch(hideVisited, (newVal) => {
  sessionStorage.setItem('dustpan_hide_visited', String(newVal));
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

const hiddenCount = computed(() => {
  if (!hideVisited.value) return 0;
  return props.results.filter((r) => visitedItems.value.has(r.itemId)).length;
});

const filteredResults = computed(() => {
  if (!hideVisited.value) return props.results;
  return props.results.filter((r) => !visitedItems.value.has(r.itemId));
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

const visibilityStatusMessage = computed(() => {
  if (!hideVisited.value) return '';
  
  const count = hiddenCount.value;
  if (count === 0) {
    return $i18n('table-visibility-none-hidden');
  }
  return $i18n('table-visibility-hidden-announce', count, count);
});

const allVisitedAndHidden = computed(() => {
  return (
    hideVisited && filteredResults.value.length === 0
  );
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

const geographicSortAriaLabel = computed(() => {
  const sortColumn = Object.keys(sortState.value)[0];
  const sortOrder = sortColumn ? sortState.value[sortColumn] : null;
  
  if (sortColumn !== 'geographic') {
    return $i18n('table-header-geographic-default');
  }
  return sortOrder === 'asc' 
    ? $i18n('table-header-geographic-ascending')
    : $i18n('table-header-geographic-descending');
});


function markVisited(itemId: string) {
  setTimeout(() => {
    visitedItems.value.add(itemId);
  }, 100);
}

function isVisited(itemId: string) {
  return visitedItems.value.has(itemId);
}
function toggleHideVisited() {
  hideVisited.value = !hideVisited.value;
}


function updateHeaderAriaLabels() {
  nextTick(() => {
    const buttons = document.querySelectorAll(".cdx-table th button");
    if (buttons[0]) buttons[0].setAttribute("aria-label", qidSortAriaLabel.value);
    if (buttons[1]) buttons[1].setAttribute("aria-label", labelSortAriaLabel.value);
    if (buttons[2]) buttons[2].setAttribute("aria-label", geographicSortAriaLabel.value);
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

.visibility-controls {
  top: var(--spacing-75);
  right: var(--spacing-75);
  z-index: 1;
  display: flex;
  align-items: center;
  gap: var(--spacing-50);
}

.hidden-count {
  color: var(--color-subtle);
  font-size: var(--font-size-medium);
}

.visibility-toggle {
  height: 2rem;
  min-width: 2rem;
  width: 2rem;
  padding-block: 0;
  padding-inline: var(--spacing-25) !important;
  white-space: nowrap;
  background-color: var(--background-color-interactive) !important;
  border: 0.0625rem solid var(--border-color-interactive) !important;
  color: var(--color-base) !important;
}

/* hidden state styling */
.visibility-toggle.is-hidden {
  background-color: var(--background-color-progressive) !important;
  border-color: transparent !important;
  color: var(--color-inverted-fixed) !important;
}

.visibility-toggle.is-hidden:focus-visible {
  outline: 2px solid var(--color-base);
}

.visibility-toggle :deep(.cdx-icon) {
  color: inherit !important; /* inherit from button color */
}

@media (min-width: 640px) {
  .visibility-toggle {
    padding-block: 0;
    padding-inline: var(--spacing-75) !important;
    width: auto !important;
    min-width: auto !important;
  }
}

.toggle-text {
  display: none;
}

@media (min-width: 640px) {
  .toggle-text {
    display: inline;
  }
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


.external-link {
  font-weight: 700;
  color: var(--color-progressive);
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  text-decoration: none;
}

.external-link:hover {
  text-decoration: underline;
}

.external-icon {
  font-size: 0.875rem;
  color: var(--color-progressive);
}

.empty-state {
  text-align: center;
  padding: var(--spacing-100);
  color: var(--color-subtle);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.empty-state p {
  margin: 0;
  color: var(--color-base);
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

.results-wrapper.has-data :deep(.cdx-table table) {
  width: max-content;
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

/* desktop: allow lemma to wrap */
@media (min-width: 640px) {
  :deep(.cdx-table table) {
    width: 100%; /* table fills container on desktop */
  }

  :deep(.cdx-table td:nth-child(3)),
  :deep(.cdx-table td:nth-child(4)) {
    /* lemma column (3rd column) */
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

/* hide table visual structure when showing connection error */


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

.empty-state h3 {
  margin: 0 0 var(--spacing-100) 0;
  color: var(--color-emphasized);
}

/* only style button in connection error state */
.results-wrapper.connection-error .empty-state button {
  align-self: center;
  margin-top: var(--spacing-75);
  pointer-events: auto;
  position: relative;
  z-index: 1;
}

/* style for screen reader only */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>