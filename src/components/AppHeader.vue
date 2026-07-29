<!--
  SPDX-License-Identifier: GPL-2.0-or-later

  Dustpan
  A tool to uncover WikiProjects that can be improved on Wikidata
  @see https://github.com/wikicollabs/dustpan
-->

<template>
  <header class="app-header">
    <div class="header-content">
      <div class="logo">
        <dustpanLogo
          ref="logoRef"
          class="header-logo"
          role="button"
          :aria-label="`dustpan ${$i18n('logo-alt')}`"
          tabindex="0"
          @click="goHome"
          @keydown.enter="goHome"
          @keydown.space.prevent="goHome"
          style="cursor: pointer"
        />
      </div>
      <settings-menu />
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, getCurrentInstance } from 'vue';
import SettingsMenu from "./SettingsMenu.vue";
import dustpanLogo from "./icons/DustpanLogo.vue";

const instance = getCurrentInstance();
const $i18n = instance?.appContext.config.globalProperties.$i18n as (key: string, ...params: unknown[]) => string;

const logoRef = ref<InstanceType<typeof dustpanLogo> | null>(null);
const emit = defineEmits<{
  home: [];
}>();

const goHome = () => {
  emit('home');
};

defineExpose({
  focusLogo: () => {
    const el = (logoRef.value as any)?.$el || logoRef.value;
    el?.focus?.();
  }
});
</script>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: var(--background-color-base);
  border-bottom: 0.0625rem solid var(--border-color-base);
  height: 3.375rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-block: var(--spacing-50);
  padding-inline-start: var(--spacing-100);
  padding-inline-end: var(--spacing-75);
}

@media (min-width: 640px) {
  .app-header {
    height: 4rem;
    padding: var(--spacing-75) var(--spacing-200);
  }
}

.header-content {
  display: flex;
  width: 100%; /* make it fill the header */
  height: 100%;
  justify-content: space-between;
  align-items: center;
}

.settings-menu {
  display: flex;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-50);
}

.header-logo {
  width: auto;
  height: 2.25rem;
  cursor: pointer;
  color: #3056a9;
}
</style>