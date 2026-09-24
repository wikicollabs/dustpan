/**
 * SPDX-License-Identifier: GPL-2.0-or-later
 *
 * Dustpan - useVisitedItems composable
 * A tool to uncover WikiProjects that can be improved on Wikidata
 * @see https://github.com/wikicollabs/dustpan
 */

import { ref, computed, watch, type Ref, type ComputedRef } from "vue";
import type { SearchResultItem } from "../../../state/searchStore";

const STORAGE_KEY_VISITED = "dustpan_visited";
const STORAGE_KEY_HIDE_VISITED = "dustpan_hide_visited";

type I18nFn = (key: string, ...params: unknown[]) => string;

export interface UseVisitedItemsReturn {
  visitedItems: ComputedRef<Set<string>>;
  hideVisited: Ref<boolean>;
  visibilityStatusMessage: Ref<string>;
  hiddenCount: ComputedRef<number>;
  filteredResults: ComputedRef<SearchResultItem[]>;
  allVisitedAndHidden: ComputedRef<boolean>;
  markVisited: (itemId: string) => void;
  isVisited: (itemId: string) => boolean;
  toggleHideVisited: () => void;
  restoreFromStorage: () => void;
}

/**
 * @param results - reactive results list (e.g. toRef(props, 'results'))
 * @param scopeKey - reactive key identifying the current wikiproject+query+scope combination
 * @param $i18n - the app's i18n function
 */
export function useVisitedItems(
  results: Ref<SearchResultItem[]>,
  scopeKey: Ref<string>,
  $i18n: I18nFn
): UseVisitedItemsReturn {
  const visitedByScope = ref<Record<string, Set<string>>>({});
  const hideVisited = ref(false);
  const visibilityStatusMessage = ref("");

  function restoreFromStorage(): void {
    const savedVisited = sessionStorage.getItem(STORAGE_KEY_VISITED);

    if (savedVisited) {
      try {
        const parsed = JSON.parse(savedVisited);

        if (
          Array.isArray(parsed) ||
          parsed === null ||
          typeof parsed !== "object"
        ) {
          sessionStorage.removeItem(STORAGE_KEY_VISITED);
        } else {
          const restored: Record<string, Set<string>> = {};
          let isValid = true;

          for (const scope in parsed) {
            const items = parsed[scope];

            if (
              !Array.isArray(items) ||
              !items.every(
                (itemId) => typeof itemId === "string"
              )
            ) {
              isValid = false;
              break;
            }

            restored[scope] = new Set(items);
          }

          if (isValid) {
            visitedByScope.value = restored;
          } else {
            sessionStorage.removeItem(STORAGE_KEY_VISITED);
          }
        }
      } catch {
        sessionStorage.removeItem(STORAGE_KEY_VISITED);
      }
    }

    const savedHideVisited = sessionStorage.getItem(STORAGE_KEY_HIDE_VISITED);

    if (savedHideVisited) {
      hideVisited.value = savedHideVisited === "true";
    }
  }

  // save to sessionStorage on changes
  watch(
    visitedByScope,
    (newState) => {
      const serializable: Record<string, string[]> = {};
      for (const scope in newState) {
        serializable[scope] = [...newState[scope]];
      }
      sessionStorage.setItem(STORAGE_KEY_VISITED, JSON.stringify(serializable));
    },
    { deep: true }
  );

  watch(hideVisited, (newVal) => {
    sessionStorage.setItem(STORAGE_KEY_HIDE_VISITED, String(newVal));
  });

  const visitedItems = computed<Set<string>>(() => {
    return visitedByScope.value[scopeKey.value] ?? new Set();
  });

  const hiddenCount = computed<number>(() => {
    if (!hideVisited.value) return 0;
    return results.value.filter((r) => visitedItems.value.has(r.itemId)).length;
  });

  const filteredResults = computed<SearchResultItem[]>(() => {
    if (!hideVisited.value) return results.value;

    const filtered = results.value.filter((r) => {
      const isVisited = visitedItems.value.has(r.itemId);
      return !isVisited;
    });

    return filtered;
  });

  const allVisitedAndHidden = computed<boolean>(() => {
    return results.value.length > 0 && hideVisited.value && filteredResults.value.length === 0;
  });

  function markVisited(itemId: string): void {
    const scope = scopeKey.value;
    setTimeout(() => {
      if (!visitedByScope.value[scope]) {
        visitedByScope.value[scope] = new Set<string>();
      }
      visitedByScope.value[scope].add(itemId);
    }, 100);
  }

  function isVisited(itemId: string): boolean {
    return visitedItems.value.has(itemId);
  }

  function toggleHideVisited(): void {
    hideVisited.value = !hideVisited.value;
    if (hideVisited.value) {
      const count = hiddenCount.value;
      visibilityStatusMessage.value = $i18n("table-visibility-hidden-announce", count, count);
    } else {
      visibilityStatusMessage.value = "";
    }
  }

  return {
    visitedItems,
    hideVisited,
    visibilityStatusMessage,
    hiddenCount,
    filteredResults,
    allVisitedAndHidden,
    markVisited,
    isVisited,
    toggleHideVisited,
    restoreFromStorage,
  };
}