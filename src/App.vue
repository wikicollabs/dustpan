<!--
  SPDX-License-Identifier: GPL-2.0-or-later

  Dustpan
  A tool to uncover WikiProjects that can be improved on Wikidata
  @see https://github.com/wikicollabs/dustpan
-->

<template>
  <div class="app">
    <CdxToastContainer />

    <AppHeader @home="goHome" />

    <main class="main-content">
      <LandingView
        v-if="store.currentView === 'landing'"
        v-model:wikiproject="store.selectedWikiproject"
        v-model:query-id="store.selectedQueryId"
        v-model:scope="scopeValue"
        :scope-initial-value="scopeInitialValue"
        :disabled="store.isLoading"
        @search="executeSearch"
      />

      <SearchView
        v-else-if="store.currentView === 'search'"
        v-model:wikiproject="store.selectedWikiproject"
        v-model:query-id="store.selectedQueryId"
        v-model:scope="scopeValue"
        :scope-initial-value="scopeInitialValue"
        :disabled="store.isLoading"
        :searched-wikiproject="store.searchedWikiproject"
        :searched-query-id="store.searchedQueryId"
        :results="store.results"
        :is-loading="store.isLoading"
        :error="store.error"
        :connection-error="store.connectionError"
        @search="executeSearch"
      />
    </main>

    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, getCurrentInstance } from "vue";
import { CdxToastContainer, useToast } from "@wikimedia/codex";
import AppHeader from "./components/AppHeader.vue";
import AppFooter from "./components/AppFooter.vue";
import LandingView from "./views/LandingView.vue";
import SearchView from "./views/SearchView.vue";
import { useSearchStore } from "./state/searchStore";
import { readStateFromUrl } from "./state/urlState";
import { queryHasScope } from "./query/queries";

const instance = getCurrentInstance();
const $i18n = instance?.appContext.config.globalProperties.$i18n as (key: string, ...params: unknown[]) => string;

const toast = useToast();
const store = useSearchStore();

// App.vue doesn't own scopeValue's source of truth. ScopeSelect.vue
// (mounted deep inside SearchPanel.vue) resolves the value and emits it
// via v-model:scope. Fetching and persistence both live in ScopeSelect's
// own domain: query/fetchScopeOptions.ts and state/scopeStorage.ts.
//
// Typed to allow `undefined` on purpose: it's used as a one-shot sentinel
// meaning "ScopeSelect hasn't emitted yet," see waitForScopeResolution
// below.
const scopeValue = ref<string | null | undefined>(null);

// One-shot seed passed down to ScopeSelect as `initial-value`, set from
// the URL on mount/popstate. null = no URL value, ScopeSelect falls
// back to its own localStorage lookup as before.
//
// KNOWN LIMITATION (accepted, not fixed): ScopeSelect only reads this on
// its own onMounted. Landing<->search transitions remount it fine (view
// swap via v-if), so this works for those. But back/forward WITHIN
// search view (two different searches, same view, ScopeSelect never
// unmounts) won't visually refresh the dropdown to match. Search
// results will still be correct, the select just won't visually catch up.
const scopeInitialValue = ref<string | null>(null);

// waits for ScopeSelect (nested 3 levels down) to resolve and emit its
// validated value at least once. sentinel pattern: caller must set
// scopeValue.value = undefined right before calling this, since
// ScopeSelect always emits a real QID or null (never undefined), so
// the watcher is guaranteed to fire exactly once, even if the resolved
// value happens to equal what we'd have guessed anyway.
//
// 3s timeout safety net: if ScopeSelect never mounts/resolves for some
// reason, don't hang the app forever, proceed with whatever's there.
// NOTE: within-search-view popstate (two searches, same view, ScopeSelect
// never remounts, see KNOWN LIMITATION above) will always hit this
// timeout rather than the real resolution, since nothing re-emits on a
// prop change alone. Bounded 3s stall in that case, not a true fix.
function waitForScopeResolution(): Promise<void> {
  return new Promise((resolve) => {
    const stop = watch(scopeValue, () => {
      stop();
      resolve();
    });
    setTimeout(() => {
      stop();
      resolve();
    }, 3000);
  });
}

async function onPopState() {
  const urlState = readStateFromUrl();
  store.setView(urlState.view);

  if (urlState.view === "search" && urlState.wikiproject && urlState.queryId) {
    store.selectedWikiproject = urlState.wikiproject;
    store.selectedQueryId = urlState.queryId;

    if (queryHasScope(urlState.queryId)) {
      scopeValue.value = undefined;
      scopeInitialValue.value = urlState.scope;
      await waitForScopeResolution();
      await store.executeSearch(scopeValue.value ?? null);
    } else {
      scopeValue.value = null;
      scopeInitialValue.value = null;
      await store.executeSearch(null);
    }
  } else {
    scopeValue.value = null;
    scopeInitialValue.value = null;
  }
}

function goHome() {
  store.goHome();
}

async function executeSearch() {
  await store.executeSearch(scopeValue.value);
}

onMounted(async () => {
  window.addEventListener("popstate", onPopState);

  const urlState = readStateFromUrl();
  const urlHasFullSearch = urlState.view === "search" && urlState.wikiproject && urlState.queryId;

  if (urlHasFullSearch) {
    // shared link / reload directly into a search. URL wins over
    // localStorage entirely, but don't fire the query with a raw,
    // unvalidated URL QID: render the search view so ScopeSelect mounts,
    // hand it the URL value as a starting point via scopeInitialValue,
    // then WAIT for ScopeSelect's own validation (against the real
    // fetched options list) before querying. One fetch, one source of
    // truth: UI and query can't disagree on a bad/stale QID anymore.
    store.selectedWikiproject = urlState.wikiproject;
    store.selectedQueryId = urlState.queryId;

    if (queryHasScope(urlState.queryId)) {
      scopeValue.value = undefined;
      scopeInitialValue.value = urlState.scope;
      store.setView("search");
      await waitForScopeResolution();
      await store.executeSearch(scopeValue.value ?? null);
    } else {
      // this query type has no scope. Nothing will ever mount to
      // resolve one, don't wait, just fire.
      scopeValue.value = null;
      scopeInitialValue.value = null;
      store.setView("search");
      await store.executeSearch(null);
    }
  } else {
    store.restoreLastSearch();
  }

  watch(
    () => store.currentView,
    (view) => {
      localStorage.setItem("dustpan_last_view", view);
    }
  );

  const toastLang = localStorage.getItem("language_change_toast");
  if (toastLang) {
    toast.show({
      message: $i18n("settings-language-changed", toastLang),
      type: "success",
      preventUserDismiss: true,
      autoDismiss: true,
    });
    localStorage.removeItem("language_change_toast");
  }

  if (!urlHasFullSearch) {
    const skipRequery = localStorage.getItem("dustpan_skip_requery");
    const lastView = localStorage.getItem("dustpan_last_view");
    if (skipRequery && lastView === "search" && store.selectedWikiproject && store.selectedQueryId) {
      localStorage.removeItem("dustpan_skip_requery");
      await executeSearch();
    }
  }
});
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--background-color-base);
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>