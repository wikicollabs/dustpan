<!--
  SPDX-License-Identifier: GPL-2.0-or-later

  Dustpan
  A tool to uncover WikiProjects that can be improved on Wikidata
  @see https://github.com/wikicollabs/dustpan
-->

<template>
  <div
    ref="wrapperRef"
    class="cdx-select-with-search"
    :class="{
      'cdx-select-with-search--disabled': disabled,
      'cdx-select-with-search--expanded': isExpanded,
    }"
  >
    <div class="cdx-select-with-search__trigger-stack">
      <cdx-select
        :selected="selected"
        :menu-items="[]"
        :disabled="disabled"
        :default-label="defaultLabel"
        class="cdx-select-with-search__visual"
        aria-hidden="true"
        tabindex="-1"
      >
        <template #label>
          <span
            class="cdx-select-with-search__label"
            :class="{ 'cdx-select-with-search__label--placeholder': !selectedLabel }"
          >{{ selectedLabel || defaultLabel }}</span>
        </template>
      </cdx-select>

      <button
        ref="handleRef"
        type="button"
        class="cdx-select-with-search__overlay-handle"
        role="select"
        :disabled="disabled"
        aria-haspopup="listbox"
        :aria-expanded="isExpanded"
        :aria-controls="menuId"
        @click="toggleExpanded"
        @keydown="onHandleKeydown"
      />
    </div>

    <div v-if="isExpanded" class="cdx-select-with-search__menu">
      <div class="cdx-select-with-search__search-wrapper">
        <cdx-text-input
          ref="searchInputRef"
          v-model="searchQuery"
          class="cdx-select-with-search__search-input"
          input-type="search"
          :start-icon="cdxIconSearch"
          :clearable="true"
          :placeholder="searchPlaceholder"
          :aria-label="$i18n('search-scope-search-placeholder')"
          :aria-expanded="isExpanded"
          :aria-controls="menuId"
          :aria-activedescendant="activeDescendantId"
          aria-autocomplete="list"
          @keydown="onSearchKeydown"
        />
      </div>

      <cdx-menu
        :id="menuId"
        ref="menuRef"
        :selected="selected"
        :menu-items="filteredMenuItems"
        :expanded="isExpanded"
        @update:selected="onSelect"
      >
        <template #no-results>
          {{ noResultsText }}
        </template>
      </cdx-menu>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount, useId, getCurrentInstance } from "vue";
import { CdxTextInput, CdxMenu, CdxSelect } from "@wikimedia/codex";
import { cdxIconSearch } from "@wikimedia/codex-icons";

const instance = getCurrentInstance();
const $i18n = instance?.appContext.config.globalProperties.$i18n as (key: string, ...params: unknown[]) => string;

interface SelectMenuItem {
  value: string | number | null;
  label: string;
}

const props = withDefaults(defineProps<{
  menuItems?: SelectMenuItem[];
  selected?: string | number | null;
  disabled?: boolean;
  defaultLabel?: string;
  searchPlaceholder?: string;
  ariaLabel?: string;
  noResultsText?: string;
}>(), {
  menuItems: () => [],
  selected: null,
  disabled: false,
  defaultLabel: "",
  searchPlaceholder: "Search",
  ariaLabel: "",
  noResultsText: "No results found.",
});

const emit = defineEmits<{
  "update:selected": [value: string | number | null];
  blur: [];
  focus: [];
}>();

const wrapperRef = ref<HTMLElement | null>(null);
const handleRef = ref<HTMLButtonElement | null>(null);
const searchInputRef = ref<InstanceType<typeof CdxTextInput> | null>(null);
const menuRef = ref<InstanceType<typeof CdxMenu> | null>(null);

const isExpanded = ref(false);
const searchQuery = ref("");
const menuId = useId();

const selectedLabel = computed(() => {
  const found = props.menuItems.find((item) => item.value === props.selected);
  return found ? found.label : "";
});

const filteredMenuItems = computed(() => {
  if (!searchQuery.value) return props.menuItems;
  const search = searchQuery.value.toLowerCase();
  return props.menuItems.filter((item) =>
    item.label.toLowerCase().includes(search)
  );
});

const activeDescendantId = computed(() => {
  const highlighted = menuRef.value?.getHighlightedMenuItem?.();
  return highlighted ? highlighted.id : null;
});

function openMenu() {
  if (props.disabled || isExpanded.value) return;
  isExpanded.value = true;
  searchQuery.value = "";
  emit("focus");
  nextTick(() => {
    searchInputRef.value?.focus?.();
  });
}

function closeMenu({ refocusHandle = false }: { refocusHandle?: boolean } = {}) {
  if (!isExpanded.value) return;
  isExpanded.value = false;
  searchQuery.value = "";
  emit("blur");
  if (refocusHandle) {
    nextTick(() => {
      handleRef.value?.focus();
    });
  }
}

function toggleExpanded() {
  if (props.disabled) return;
  if (isExpanded.value) {
    closeMenu();
  } else {
    openMenu();
  }
}

function onSelect(value: string | number | null) {
  emit("update:selected", value);
  closeMenu({ refocusHandle: true });
}

function onHandleKeydown(event: KeyboardEvent) {
  if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
    event.preventDefault();
    if (!isExpanded.value) openMenu();
  } else if (event.key === "Escape" && isExpanded.value) {
    closeMenu({ refocusHandle: true });
  }
}

function onSearchKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.preventDefault();
    closeMenu({ refocusHandle: true });
    return;
  }
  menuRef.value?.delegateKeyNavigation?.(event);
}

function onDocumentMousedown(event: MouseEvent) {
  if (!isExpanded.value) return;
  if (wrapperRef.value && !wrapperRef.value.contains(event.target as Node)) {
    closeMenu();
  }
}

onMounted(() => {
  document.addEventListener("mousedown", onDocumentMousedown);
});

onBeforeUnmount(() => {
  document.removeEventListener("mousedown", onDocumentMousedown);
});
</script>

<style scoped>
.cdx-select-with-search {
  position: relative;
  width: 100%;
  min-width: 0;
}

.cdx-select-with-search__trigger-stack {
  position: relative;
  z-index: 2;
  width: 100%;
}

/*
 * cdx-select here is purely visual. Mouse interaction is disabled entirely
 * via pointer-events: none, and its internal popup menu (which should
 * always stay empty since menu-items=[]) is kept from ever appearing.
 * width:100% is also forced into its internal markup, since cdx-select's
 * default width follows its content (fit-content), not the full width.
 */
.cdx-select-with-search__visual {
  display: block;
  width: 100%;
  pointer-events: none;
}

.cdx-select-with-search__visual :deep(> *) {
  width: 100%;
}

.cdx-select-with-search__visual :deep([role="listbox"]) {
  display: none !important;
}

.cdx-select-with-search--expanded .cdx-select-with-search__visual :deep(.cdx-select-vue__handle),
.cdx-select-with-search--expanded .cdx-select-with-search__visual :deep(button) {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

/* This element is the one that actually handles clicks, keyboard, and focus. */
.cdx-select-with-search__overlay-handle {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  background: transparent;
  border: none;
  cursor: pointer;
}

.cdx-select-with-search--disabled .cdx-select-with-search__overlay-handle {
  cursor: not-allowed;
}

.cdx-select-with-search--expanded .cdx-select-with-search__overlay-handle,
.cdx-select-with-search__overlay-handle:focus:not(:active) {
  border-width: var(--border-width-base);
  border-style: var(--border-style-base);
  border-color: var(--border-color-progressive--focus);
  box-shadow: var(--box-shadow-inset-small) var(--box-shadow-color-progressive--focus);
  outline: var(--outline-base--focus);
  border-radius: var(--border-radius-base);
}

.cdx-select-with-search__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: start;
  color: var(--color-base);
}

.cdx-select-with-search__label--placeholder {
  color: var(--color-placeholder);
}

.cdx-select-with-search--disabled .cdx-select-with-search__label {
  color: var(--color-disabled);
}

.cdx-select-with-search__menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 1;
  margin-top: -1px;
  background-color: var(--background-color-base);
  border: var(--border-width-base) var(--border-style-base) var(--border-color-interactive);
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  border-bottom-left-radius: var(--border-radius-base);
  border-bottom-right-radius: var(--border-radius-base);
  box-shadow: var(--box-shadow-drop-medium, 0 2px 6px rgba(0, 0, 0, 0.15));
  overflow: hidden;
}

.cdx-select-with-search__search-wrapper {
  padding: var(--spacing-50);
  border-bottom: var(--border-width-base) var(--border-style-base) var(--border-color-subtle);
}

.cdx-select-with-search__search-input {
  width: 100%;
}

.cdx-select-with-search__menu :deep(.cdx-menu) {
  position: static;
  width: 100%;
  max-width: none;
  max-height: 14rem;
  overflow-y: auto;
  border: none;
  box-shadow: none;
  background: none;
  border-radius: 0;
}
</style>