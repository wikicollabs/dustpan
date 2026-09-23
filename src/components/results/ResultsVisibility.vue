<!--
  SPDX-License-Identifier: GPL-2.0-or-later

  Dustpan - Results Visibility
  A tool to uncover WikiProjects that can be improved on Wikidata
  @see https://github.com/wikicollabs/dustpan
-->

<template>
  <div v-if="visible" class="visibility-controls">
    <span v-if="hideVisited" class="hidden-count">
      {{ $i18n('table-hidden-count', hiddenCount) }}
    </span>
    <CdxButton
      ref="toggleButtonRef"
      class="visibility-toggle"
      :class="{ 'is-hidden': hideVisited }"
      action="progressive"
      weight="quiet"
      :aria-label="`${$i18n('table-hide-visited-aria')} ${hideVisited ? $i18n('state-on') : $i18n('state-off')}`"
      :aria-pressed="hideVisited"
      @click="$emit('toggle')"
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

<script setup lang="ts">
import { ref, getCurrentInstance } from "vue";
import { CdxButton, CdxIcon } from "@wikimedia/codex";
import { cdxIconEye, cdxIconEyeClosed } from "@wikimedia/codex-icons";

const instance = getCurrentInstance();
const $i18n = instance?.appContext.config.globalProperties.$i18n as (key: string, ...params: unknown[]) => string;

interface Props {
  visible?: boolean;
  hideVisited?: boolean;
  hiddenCount?: number;
  visibilityStatusMessage?: string;
}

withDefaults(defineProps<Props>(), {
  visible: false,
  hideVisited: false,
  hiddenCount: 0,
  visibilityStatusMessage: "",
});

defineEmits<{
  (e: "toggle"): void;
}>();

const toggleButtonRef = ref<InstanceType<typeof CdxButton> | null>(null);

function focus() {
  toggleButtonRef.value?.$el?.focus();
}

defineExpose({ focus });
</script>

<style scoped>
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