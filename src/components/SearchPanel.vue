<!--
  SPDX-License-Identifier: GPL-2.0-or-later

  Dustpan
  A tool to uncover WikiProjects that can be improved on Wikidata
  @see https://github.com/wikicollabs/dustpan
-->

<template>
  <div class="search-panel">
    <cdx-field
      class="wikiproject-type-field"
      :status="wikiprojectError ? 'error' : 'default'"
    >
      <template #label>{{ $i18n('search-wikiproject-label') }}</template>
      <cdx-select
        v-model:selected="selectedWikiprojectValue"
        :menu-items="wikiprojectOptions"
        :default-label="$i18n('search-wikiproject-placeholder')"
        :aria-label="$i18n('search-wikiproject-label')"
        :status="wikiprojectError ? 'error' : 'default'"
        @blur="onWikiprojectBlur"
        @focus="onWikiprojectFocus"
      />
    </cdx-field>
    <cdx-message
      v-if="wikiprojectError"
      type="error"
      :inline="true"
      class="error-message"
      ref="wikiprojectErrorRef"
      tabindex="-1"
    >
      {{ wikiprojectError }}
    </cdx-message>

    <cdx-field
      class="query-id-field"
      :class="{ 'field-disabled': isQueryIdDisabled }"
      :status="queryIdError ? 'error' : 'default'"
    >
      <template #label>{{ $i18n('search-query-label') }}</template>
      <cdx-select
        v-model:selected="selectedQueryIdValue"
        :menu-items="queryIdOptions"
        :disabled="isQueryIdDisabled"
        :default-label="$i18n('search-query-placeholder')"
        :aria-label="$i18n('search-query-label')"
        :status="queryIdError ? 'error' : 'default'"
        @blur="onQueryIdBlur"
        @focus="onQueryIdFocus"
      />
    </cdx-field>

    <cdx-message
      v-if="queryIdError"
      type="error"
      :inline="true"
      class="error-message"
      ref="queryIdErrorRef"
      tabindex="-1"
    >
      {{ queryIdError }}
    </cdx-message>

    <cdx-field
      class="scope-type-field"
      :class="{ 'field-disabled': isScopeDisabled }"
      :hide-label="true"
    >
      <template #label>{{ scopeLabel }}</template>
      <ScopeSelect
        :key="scopeId"
        :scope-id="scopeId ?? ''"
        :disabled="isScopeDisabled"
        :initial-value="scopeInitialValue"
        :placeholder-label="scopePlaceholderLabel"
        :all-option-label="scopeAllOptionLabel"
        :search-placeholder="$i18n('search-scope-search-placeholder')"
        :aria-label="scopeLabel"
        :no-results-text="$i18n('search-scope-no-results')"
        @update:selected="onScopeSelected"
      />
    </cdx-field>

    <cdx-button
      action="progressive"
      weight="primary"
      type="button"
      :disabled="isSearchDisabled"
      :aria-label="$i18n('search-button')"
      :aria-disabled="isSearchDisabled"
      @click="handleSearch"
      class="search-button"
    >
      <cdx-icon :icon="cdxIconSearch" />
      {{ $i18n('search-button') }}
    </cdx-button>

    <cdx-message
      v-if="hasChangedSelection && resultsExist && activeFilterCount > 0"
      type="notice"
      inline
      class="selection-change-notice"
      role="status"
    >
      {{ $i18n('search-panel-filter-clear-notice') }}
    </cdx-message>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, getCurrentInstance, nextTick } from "vue";
import { CdxField, CdxSelect, CdxButton, CdxIcon, CdxMessage } from "@wikimedia/codex";
import { cdxIconSearch } from "@wikimedia/codex-icons";
import ScopeSelect from "./ScopeSelect.vue";
import {
  getWikiprojectOptions,
  getQueryOptionsForProject,
  getAllQueryValues,
  queryHasScope,
  getQueryScopeId,
  getScopeLabel,
  getScopeAllOptionLabel,
} from "../query/queries";

const instance = getCurrentInstance();
const $i18n = instance?.appContext.config.globalProperties.$i18n as (key: string, ...params: unknown[]) => string;

const props = withDefaults(defineProps<{
  wikiproject?: string | null;
  queryId?: string | null;
  scope?: string | null;
  // one-shot value resolved from the URL by App.vue on mount/popstate.
  // just passthrough to ScopeSelect's initial-value. see that file for
  // why this exists (kills the mount race for URL-driven scope).
  scopeInitialValue?: string | null;
  disabled?: boolean;
  activeFilterCount?: number;
  resultsExist?: boolean;
}>(), {
  wikiproject: null,
  queryId: null,
  scope: null,
  scopeInitialValue: null,
  disabled: false,
  activeFilterCount: 0,
  resultsExist: false,
});

const emit = defineEmits<{
  "update:wikiproject": [value: string | null];
  "update:query-id": [value: string | null];
  "update:scope": [value: string | null];
  search: [];
}>();

const hasChangedSelection = ref(false);

watch([() => props.wikiproject, () => props.queryId, () => props.scope], () => {
  if (props.resultsExist) {
    hasChangedSelection.value = true;
  }
});

const wikiprojectOptions = [...getWikiprojectOptions()].sort((a, b) =>
  a.label.localeCompare(b.label)
);

const isQueryIdDisabled = computed(() => !props.wikiproject);
const hasScope = computed(() => queryHasScope(props.queryId));
const isScopeDisabled = computed(() => !props.queryId || !hasScope.value);
const scopeId = computed(() => getQueryScopeId(props.queryId));
const scopeLabelKey = computed(() => (scopeId.value ? getScopeLabel(scopeId.value) : null));
const scopeLabel = computed(() => (scopeLabelKey.value ? $i18n(scopeLabelKey.value) : ""));

// scope field is always visible, so its placeholder has to communicate
// 2 distinct states:
//   1. no queryId yet, OR queryId chosen with a scope -> generic
//      "pick something" placeholder (never states "All" here, that
//      text belongs only to the actual "All ___" menu item, see
//      scopeAllOptionLabel below)
//   2. queryId chosen, no scope applies -> explicit "doesn't apply here" placeholder
const scopePlaceholderLabel = computed(() => {
  if (props.queryId && !hasScope.value) return $i18n('search-scope-no-scope-placeholder');
  return $i18n('search-scope-select-placeholder');
});

// label for the actual "All ___" menu item inside the scope dropdown
// (distinct from scopePlaceholderLabel above, which is the closed-handle
// text and never says "All"). scope-specific per scopeId, e.g.
// "All geographic scope" for geographicScope.
const scopeAllOptionLabel = computed(() => {
  if (!scopeId.value) return "";
  const key = getScopeAllOptionLabel(scopeId.value);
  return key ? $i18n(key) : "";
});

// flat list, no "group" field (unused in current data, always empty)
const queryIdOptions = computed(() => {
  if (!props.wikiproject) return [];
  const raw = getQueryOptionsForProject(props.wikiproject);
  return raw
    .map((item) => ({
      value: item.value,
      label: $i18n(item.label),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
});

const wikiprojectBlurred = ref(false);
const queryIdBlurred = ref(false);

const selectedWikiprojectValue = computed({
  get() {
    return props.wikiproject;
  },
  set(value: string | null) {
    emit("update:wikiproject", value);
    emit("update:query-id", null);
  },
});

const selectedQueryIdValue = computed({
  get() {
    return props.queryId;
  },
  set(value: string | null) {
    emit("update:query-id", value);
  },
});

const wikiprojectError = computed(() => {
  if (!wikiprojectBlurred.value) return "";
  if (!props.wikiproject) return "";
  const validValues = wikiprojectOptions.map((opt) => opt.value);
  if (!validValues.includes(props.wikiproject)) {
    return $i18n('errors-wikiproject-not-found');
  }
  return "";
});

const wikiprojectErrorRef = ref<InstanceType<typeof CdxMessage> | null>(null);

// watch for when the error appears
watch(wikiprojectError, (newError) => {
  if (newError) {
    nextTick(() => {
      (wikiprojectErrorRef.value as any)?.focus();
    });
  }
});

const queryIdError = computed(() => {
  if (!queryIdBlurred.value) return "";
  if (!props.queryId) return "";

  const validValues = getAllQueryValues();
  if (!validValues.includes(props.queryId)) {
    return $i18n('errors-query-not-found');
  }
  return "";
});

const queryIdErrorRef = ref<InstanceType<typeof CdxMessage> | null>(null);

watch(queryIdError, (newError) => {
  if (newError) {
    nextTick(() => {
      (queryIdErrorRef.value as any)?.focus();
    });
  }
});

function onScopeSelected(value: string | null) {
  emit("update:scope", value);
}

const isSearchDisabled = computed(() => {
  if (!props.wikiproject || !props.queryId) return true;
  if (props.disabled) return true;
  const validProjects = wikiprojectOptions.map((opt) => opt.value);
  const validQueryIds = getAllQueryValues();
  if (!validProjects.includes(props.wikiproject)) return true;
  if (!validQueryIds.includes(props.queryId)) return true;
  return false;
});

function onWikiprojectBlur() {
  wikiprojectBlurred.value = true;
}

function onQueryIdBlur() {
  queryIdBlurred.value = true;
}

function onWikiprojectFocus() {
  wikiprojectBlurred.value = false;
}

function onQueryIdFocus() {
  queryIdBlurred.value = false;
}

function handleSearch() {
  hasChangedSelection.value = false;

  wikiprojectBlurred.value = true;
  queryIdBlurred.value = true;

  if (!isSearchDisabled.value && !wikiprojectError.value && !queryIdError.value) {
    emit("search");
  }
}
</script>

<style scoped>

.field-disabled :deep(.cdx-label__label__text) {
  color: var(--color-disabled);
}

.scope-type-field {
  margin-top: calc(var(--spacing-50) * -1) !important;
}

.wikiproject-type-field + .error-message,
.query-id-field + .error-message {
  margin-top: calc(var(--spacing-75) * -1);
  margin-bottom: var(--spacing-75) !important;
}

.error-message {
  margin-bottom: var(--spacing-75);
}

.query-id-field {
  margin-top: 0 !important;
}

.search-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: var(--spacing-75);
}

.search-panel :deep(.cdx-field) {
  margin-block-start: 0 !important;
}

.search-button {
  width: 100%;
  min-width: 0; /* CRITICAL - allows it to shrink below codex defaults */
  max-width: none !important;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-50);
}

@media (min-width: 640px) {
  .search-button {
    width: 100%;
  }
}

.selection-change-notice {
  display: flex;
  align-items: flex-start;
  align-self: flex-start;
  gap: var(--spacing-50);
  color: var(--color-base);
  font-size: var(--font-size-medium);
  font-weight: 400 !important;
}

.selection-change-notice :deep(.cdx-icon) {
  margin-top: calc((var(--line-height-small) - 1.125rem) / 2);
  color: var(--color-icon-notice);
  width: 1.125rem;
  height: 1.125rem;
  min-width: 1.125rem;
}

.selection-change-notice :deep(.cdx-message__content) {
  margin-left: 0;
  line-height: var(--line-height-small);
}

:deep(.cdx-field) {
  width: 100%;
  min-width: 0;
}

:deep(.cdx-select-vue) {
  width: 100%;
  min-width: 0;
}

:deep(.wikiproject-type-field) {
  margin-top: 0;
}
:deep(.query-id-field) {
  margin-top: 0;
}
</style>