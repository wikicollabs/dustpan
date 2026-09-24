<!--
  SPDX-License-Identifier: GPL-2.0-or-later
 
  Dustpan - Results Empty
  A tool to uncover WikiProjects that can be improved on Wikidata
  @see https://github.com/wikicollabs/dustpan
-->

<template>
  <div class="empty-state" role="status" aria-live="polite">
    <template v-if="connectionError">
      <h3>{{ $i18n('errors-unable-to-connect') }}</h3>
      <p>{{ $i18n('errors-reload-prompt') }}</p>
      <CdxButton
        action="progressive"
        weight="primary"
        @click="$emit('reload')"
        :aria-label="$i18n('errors-reload-page')"
      >
        {{ $i18n('errors-reload-page') }}
      </CdxButton>
    </template>
    <template v-else-if="allVisitedHidden">
      <p>{{ $i18n('table-all-visited') }}</p>
    </template>
    <template v-else>
      <p>{{ $i18n('table-no-results') }}</p>
      <p>{{ $i18n('table-try-query') }}</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { getCurrentInstance } from "vue";
import { CdxButton } from "@wikimedia/codex";

const instance = getCurrentInstance();
const $i18n = instance?.appContext.config.globalProperties.$i18n as (key: string, ...params: unknown[]) => string;

interface Props {
  connectionError?: boolean;
  allVisitedHidden?: boolean;
}

withDefaults(defineProps<Props>(), {
  connectionError: false,
  allVisitedHidden: false,
});

defineEmits<{
  (e: "reload"): void;
}>();
</script>

<style scoped>
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

.empty-state h3 {
  margin: 0 0 var(--spacing-100) 0;
  color: var(--color-emphasized);
}
</style>