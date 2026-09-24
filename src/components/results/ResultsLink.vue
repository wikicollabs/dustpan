<!--
  SPDX-License-Identifier: GPL-2.0-or-later

  Dustpan - Results Link
  A tool to uncover WikiProjects that can be improved on Wikidata
  @see https://github.com/wikicollabs/dustpan
-->

<template>
  <a
    :href="`https://www.wikidata.org/wiki/${itemId}`"
    target="_blank"
    rel="noopener"
    class="external-link"
    :aria-label="ariaLabel"
    @click.stop="onClick"
  >
    <span class="link-text">
      <HighlightedText :text="itemId" :filter="textFilter" />
    </span>
    <CdxIcon :icon="cdxIconLinkExternal" class="external-icon" />
  </a>
</template>

<script setup lang="ts">
import { getCurrentInstance, computed } from "vue";
import { CdxIcon } from "@wikimedia/codex";
import { cdxIconLinkExternal } from "@wikimedia/codex-icons";
import HighlightedText from "./HighlightedText.vue";

const instance = getCurrentInstance();
const $i18n = instance?.appContext.config.globalProperties.$i18n as (
  key: string,
  ...params: unknown[]
) => string;

interface Props {
  itemId: string;
  label: string;
  isVisited?: boolean;
  textFilter?: string;
}

const props = withDefaults(defineProps<Props>(), {
  isVisited: false,
  textFilter: "",
});

const emit = defineEmits<{
  (e: "visit", itemId: string): void;
}>();

// format: "[[Visited status]] - [[Item label]], [[QID]]"
// e.g. "Visited - The Inn, Q1234567"
const ariaLabel = computed(() => {
  const visitedStatus = props.isVisited
    ? $i18n('table-row-visited-status')
    : $i18n('table-row-not-visited-status');
  return `${visitedStatus} - ${props.label}, ${props.itemId}`;
});

function onClick() {
  emit("visit", props.itemId);
}
</script>

<style scoped>
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
</style>