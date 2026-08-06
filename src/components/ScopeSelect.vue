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
    :default-label="placeholderLabel"
    :search-placeholder="searchPlaceholder"
    :aria-label="ariaLabel"
    :no-results-text="noResultsText"
    @update:selected="onSelect"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import SearchableSelect from './SearchableSelect.vue';
import { getLastScopeValue, setLastScopeValue } from '../state/scopeStorage';
import type { ScopeOption } from '../types/types';
import { getBrowserLanguage } from '../i18n/displayLanguages';

const props = withDefaults(defineProps<{
  scopeId: string;
  options?: ScopeOption[] | null;
  disabled?: boolean;
  // set when App.vue resolved a scope value from the URL on mount
  // (browser back/forward or a shared link). when present, this wins
  // over localStorage, skips the async getLastScopeValue() lookup
  // entirely, which is what kills the App.vue/ScopeSelect mount race
  // for the URL-driven case. null means "no URL value, fall back to
  // localStorage" same as before.
  initialValue?: string | null;
  // closed-handle text when nothing is selected. never says "All" -
  // that word belongs only to allOptionLabel below, the actual menu item.
  placeholderLabel?: string;
  // text for the "All ___" menu item itself (e.g. "All geographic scope").
  // scope-specific, passed down from SearchPanel via getScopeAllOptionLabel.
  allOptionLabel?: string;
  searchPlaceholder?: string;
  ariaLabel?: string;
  noResultsText?: string;
}>(), {
  options: null,
  disabled: false,
  initialValue: null,
  placeholderLabel: '',
  allOptionLabel: 'All',
  searchPlaceholder: 'Search',
  ariaLabel: '',
  noResultsText: 'No results found.',
});

// external contract unchanged: null still means "all / nothing selected"
// to everything outside this component (SearchPanel, App.vue, the query
// builder). internally though, "All" needs to be a real, distinct menu
// item value - see ALL_VALUE below for why.
const emit = defineEmits<{
  'update:selected': [value: string | null];
}>();

// CdxMenuItem (via SearchableSelect -> CdxMenu) requires value to be a
// String or Number, never null - using null for the "All" item's value
// triggered a Vue prop-validation warning on every render. Worse: this
// component's `selected` ref also legitimately starts at null before
// the async fetchScopeOptions/resolution finishes, which meant "All"
// and "not resolved yet" were indistinguishable, and the "All" menu
// item's label would incorrectly flash as the closed-handle text
// before resolution completed. ALL_VALUE gives "All" its own real
// string identity so it can never collide with the "not yet resolved"
// state. Never leaves this component - onSelect and the mount-resolution
// logic below both translate it back to null before it's stored or emitted.
const ALL_VALUE = '__scope_all__';

const selected = ref<string | null>(null);

// "All" is a real, rememberable menu item (not just empty-state),
// per: picking it overwrites memory same as picking a specific value.
const menuItemsWithAll = computed(() => [
  { value: ALL_VALUE, label: props.allOptionLabel },
  ...(props.options ?? []),
]);

function getDisplayLanguage(): string {
  return localStorage.getItem('locale') || getBrowserLanguage();
}

function onSelect(value: string | null) {
  const externalValue = value === ALL_VALUE ? null : value;
  selected.value = value;
  setLastScopeValue(props.scopeId, externalValue);
  emit('update:selected', externalValue);
}

let hasResolved = false;
watch(
  () => props.options,
  (opts) => {
    if (hasResolved || !props.scopeId || opts === null) return;
    hasResolved = true;

    const candidate = props.initialValue !== null
      ? props.initialValue
      : getLastScopeValue(props.scopeId);

    const isValid = candidate !== null && opts.some((o) => o.value === candidate);

    const resolvedExternal = isValid ? candidate : null;
    selected.value = isValid ? candidate : ALL_VALUE;
    setLastScopeValue(props.scopeId, resolvedExternal);
    emit('update:selected', resolvedExternal);
  },
  { immediate: true }
);
</script>