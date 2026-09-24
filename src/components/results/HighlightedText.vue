<!--
  SPDX-License-Identifier: GPL-2.0-or-later

  Dustpan - Highlighted Text
  A tool to uncover WikiProjects that can be improved on Wikidata
  @see https://github.com/wikicollabs/dustpan
-->

<template>
  <span v-if="highlighted.matched">{{ highlighted.before }}<span class="highlighted-text">{{ highlighted.matched }}</span>{{ highlighted.after }}</span>
  <span v-else>{{ text }}</span>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  text: string;
  filter?: string;
}

const props = withDefaults(defineProps<Props>(), {
  filter: "",
});

interface HighlightParts {
  before?: string;
  matched?: string;
  after?: string;
}

const highlighted = computed<HighlightParts>(() => {
  if (!props.filter || !props.text) return {};

  const filterLower = props.filter.toLowerCase();
  const textLower = props.text.toLowerCase();
  const index = textLower.indexOf(filterLower);

  if (index === -1) return {};

  const before = props.text.slice(0, index);
  const matched = props.text.slice(index, index + props.filter.length);
  const after = props.text.slice(index + props.filter.length);

  return { before, matched, after };
});
</script>

<style scoped>
.highlighted-text {
  background-color: var(--background-color-progressive-subtle--active);
}
</style>