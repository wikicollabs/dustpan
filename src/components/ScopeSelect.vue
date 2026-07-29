<!--
  SPDX-License-Identifier: GPL-2.0-or-later

  Dustpan
  A tool to uncover WikiProjects that can be improved on Wikidata
  @see https://github.com/wikicollabs/dustpan
-->

<template>
  <searchable-select
    :menu-items="menuItemsWithAll"
    :selected="selected"
    :disabled="disabled"
    :default-label="allLabel"
    :search-placeholder="searchPlaceholder"
    :aria-label="ariaLabel"
    :no-results-text="noResultsText"
    @update:selected="onSelect"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import SearchableSelect from './SearchableSelect.vue';
import { fetchScopeOptions } from '../query/fetchScopeOptions';
import { getLastScopeValue, setLastScopeValue } from '../state/scopeStorage';
import type { ScopeOption } from '../types/types';


const props = withDefaults(defineProps<{
  scopeId: string;
  disabled?: boolean;
  // set when App.vue resolved a scope value from the URL on mount
  // (browser back/forward or a shared link). when present, this wins
  // over localStorage, skips the async getLastScopeValue() lookup
  // entirely, which is what kills the App.vue/ScopeSelect mount race
  // for the URL-driven case. null means "no URL value, fall back to
  // localStorage" same as before.
  initialValue?: string | null;
  allLabel?: string;
  searchPlaceholder?: string;
  ariaLabel?: string;
  noResultsText?: string;
}>(), {
  disabled: false,
  initialValue: null,
  allLabel: 'All',
  searchPlaceholder: 'Search',
  ariaLabel: '',
  noResultsText: 'No results found.',
});

// null = "all", matches SearchableSelect's own null-selected convention
const emit = defineEmits<{
  'update:selected': [value: string | null];
}>();

const selected = ref<string | null>(null);
const options = ref<ScopeOption[]>([]);

// "All" is a real, rememberable menu item (not just empty-state),
// per: picking it overwrites memory same as picking a specific value.
const menuItemsWithAll = computed(() => [
  { value: null, label: props.allLabel },
  ...options.value,
]);

function getDisplayLanguage(): string {
  const browserLang = navigator.language || navigator.languages?.[0];
  return localStorage.getItem('locale') || browserLang.split('-')[0].toLowerCase();
}

function onSelect(value: string | null) {
  selected.value = value;
  setLastScopeValue(props.scopeId, value);
  emit('update:selected', value);
}

onMounted(async () => {
  // component is always mounted by the parent (SearchForm), even
  // before a queryId/scope exists. bail out instead of hitting
  // fetchScopeOptions with an empty scopeId (would just log a console
  // error and return [] anyway, no point doing it every fresh page load)
  if (!props.scopeId) return;

  options.value = await fetchScopeOptions(props.scopeId, getDisplayLanguage());

  // URL wins over localStorage when present. this is the initialValue
  // path, no getLastScopeValue() call at all, so there's nothing async
  // for App.vue's mount-time logic to race against.
  const candidate = props.initialValue !== null
    ? props.initialValue
    : getLastScopeValue(props.scopeId);

  // guard against a stale qid that's no longer in the fetched list
  // (e.g. wikidata item got merged/deleted/retyped, or a bad/old shared URL)
  const isValid = candidate !== null && options.value.some((o) => o.value === candidate);

  selected.value = isValid ? candidate : null;
  setLastScopeValue(props.scopeId, selected.value);
  emit('update:selected', selected.value);
});
</script>