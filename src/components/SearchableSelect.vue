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
      'cdx-select-with-search--flipped': isFlippedAbove,
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
        inert
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
        role="combobox"
        :disabled="disabled"
        aria-haspopup="listbox"
        :aria-expanded="isExpanded"
        :aria-controls="menuId"
        :aria-label="ariaLabel"
        @click="toggleExpanded"
        @keydown="onHandleKeydown"
      />
    </div>

    <div
      ref="menuEl"
      popover="auto"
      class="cdx-select-with-search__menu"
      :class="{ 'cdx-select-with-search__menu--flipped': isFlippedAbove }"
      :style="{...floatingStyles,visibility: menuVisibility,}"
      @toggle="onMenuToggle"
    >
      <div class="cdx-select-with-search__search-wrapper">
        <cdx-text-input
          ref="searchInputRef"
          v-model="searchQuery"
          class="cdx-select-with-search__search-input"
          input-type="search"
          :start-icon="cdxIconSearch"
          :clearable="true"
          :placeholder="searchPlaceholder"
          :aria-label="$i18n('search-geographic-scope-placeholder')"
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
        :visible-item-limit="5"
        :render-in-place="true"
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
import { ref, computed, nextTick, onBeforeUnmount, useId, getCurrentInstance } from "vue";
import { CdxTextInput, CdxMenu, CdxSelect } from "@wikimedia/codex";
import { cdxIconSearch } from "@wikimedia/codex-icons";
import { useFloating, flip, size, hide, autoUpdate } from "@floating-ui/vue";

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
const menuEl = ref<HTMLElement | null>(null);
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

const { floatingStyles, placement, middlewareData, update: updateMenuPosition } = useFloating(handleRef, menuEl, {
  placement: "bottom",
  middleware: [
    size({
      padding: 8,
      apply({ availableHeight, elements, rects }) {
        elements.floating.style.width = `${rects.reference.width}px`;
        elements.floating.style.maxHeight = `${availableHeight}px`;
      },
    }),
    flip({ padding: 7 }),
    hide({ strategy: "escaped", rootBoundary: "layoutViewport" }),
    hide({ padding: 8, rootBoundary: "layoutViewport" }),
  ],
});

const isFlippedAbove = computed(() => placement.value.startsWith("top"));

const menuVisibility = computed(() => {
  const hidden =
    !!middlewareData.value.hide?.escaped ||
    !!middlewareData.value.hide?.referenceHidden;

  return hidden ? "hidden" : "visible";
});

let stopAutoUpdate: (() => void) | null = null;

function onMenuToggle(event: ToggleEvent) {
  isExpanded.value = event.newState === "open";
  if (!isExpanded.value) {
    stopAutoUpdate?.();
    stopAutoUpdate = null;
  }
}

function openMenu() {
  if (props.disabled || isExpanded.value) return;
  menuEl.value?.showPopover();
  if (handleRef.value && menuEl.value) {
    updateMenuPosition();
    stopAutoUpdate = autoUpdate(handleRef.value, menuEl.value, updateMenuPosition);
  }
  searchQuery.value = "";
  emit("focus");
  nextTick(() => {
    searchInputRef.value?.focus?.();
  });
}

function closeMenu({ refocusHandle = false }: { refocusHandle?: boolean } = {}) {
  if (!isExpanded.value) return;
  menuEl.value?.hidePopover();
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
  closeMenu();
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

onBeforeUnmount(() => {
  stopAutoUpdate?.();
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

.cdx-select-with-search__visual :deep(.cdx-select-vue__handle) {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cdx-select-with-search__visual :deep(> *) {
  width: 100%;
}

.cdx-select-with-search__visual :deep([role="listbox"]) {
  display: none !important;
}

.cdx-select-with-search--expanded:not(.cdx-select-with-search--flipped) .cdx-select-with-search__visual :deep(.cdx-select-vue__handle),
.cdx-select-with-search--expanded:not(.cdx-select-with-search--flipped) .cdx-select-with-search__visual :deep(button) {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.cdx-select-with-search--expanded.cdx-select-with-search--flipped .cdx-select-with-search__visual :deep(.cdx-select-vue__handle),
.cdx-select-with-search--expanded.cdx-select-with-search--flipped .cdx-select-with-search__visual :deep(button) {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
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

.cdx-select-with-search--expanded:not(.cdx-select-with-search--flipped) .cdx-select-with-search__overlay-handle {
  border-bottom: none;
}

.cdx-select-with-search--expanded.cdx-select-with-search--flipped .cdx-select-with-search__overlay-handle {
  border-top: none;
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
  margin: 0;
  padding: 0;
  background-color: var(--background-color-base);
  border: var(--border-width-base) var(--border-style-base) var(--border-color-interactive);
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  border-bottom-left-radius: var(--border-radius-base);
  border-bottom-right-radius: var(--border-radius-base);
  box-shadow: var(--box-shadow-drop-medium, 0 2px 6px rgba(0, 0, 0, 0.15));
  overflow: hidden;
}

.cdx-select-with-search__menu:popover-open {
  display: flex;
  flex-direction: column;
}

.cdx-select-with-search__menu--flipped {
  border-top-left-radius: var(--border-radius-base);
  border-top-right-radius: var(--border-radius-base);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.cdx-select-with-search__menu::backdrop {
  background: transparent;
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
  border: none;
  box-shadow: none;
  background: none;
  border-radius: 0;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
</style>
