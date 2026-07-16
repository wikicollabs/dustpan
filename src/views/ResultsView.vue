<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  CdxButton,
  CdxIcon,
  CdxSearchInput,
  CdxTable,
  CdxProgressBar,
} from '@wikimedia/codex'
import {
  cdxIconEye,
  cdxIconEyeClosed,
} from '@wikimedia/codex-icons'
import { useSearchDraft } from '../composables/useSearchDraft';
import { wikiProjects } from '../catalog';
import { buildGapQuery } from '../query/builder';
import { executeQuery } from '../query/client';
import { isWikidataEntityId } from '../query/validators';
import SearchControls from '../components/search/SearchControls.vue'
import {
  normalizeResults,
  type NormalizedRow,
} from '../query/normalize';

const route = useRoute()
const router = useRouter()

const {
  projectId: draftProjectId,
  gapId: draftGapId,
  facetId: draftFacetId,
  facetValue: draftFacetValue,
  project: draftProject,
  gap: draftGap,
  facet: draftFacet,
  facetValues: draftFacetValues,
  isLoadingFacetValues: isLoadingDraftFacetValues,
  facetValueError: draftFacetValueError,
  setState: setDraftState,
} = useSearchDraft({
  projectId:
    typeof route.query.project === 'string'
      ? route.query.project
      : undefined,
  gapId:
    typeof route.query.gap === 'string'
      ? route.query.gap
      : undefined,
  facetId:
    typeof route.query.facet === 'string'
      ? route.query.facet
      : undefined,
  facetValue:
    route.query.facetValue === 'all' ||
    (
      typeof route.query.facetValue === 'string' &&
      isWikidataEntityId(route.query.facetValue)
    )
      ? route.query.facetValue
      : undefined,
})

const selectedProject = computed(() => {
  const projectId =
    typeof route.query.project === 'string'
      ? route.query.project
      : undefined;

  return wikiProjects.find(
    (project) => project.id === projectId,
  );
});

watch(
  () => [
    route.query.project,
    route.query.gap,
    route.query.facet,
    route.query.facetValue,
  ] as const,
  ([projectId, gapId, facetId, facetValue]) => {
    setDraftState({
      projectId:
        typeof projectId === 'string'
          ? projectId
          : undefined,
      gapId:
        typeof gapId === 'string'
          ? gapId
          : undefined,
      facetId:
        typeof facetId === 'string'
          ? facetId
          : undefined,
      facetValue:
        facetValue === 'all' ||
        (
          typeof facetValue === 'string' &&
          isWikidataEntityId(facetValue)
        )
          ? facetValue
          : undefined,
    })
  },
)

const selectedGap = computed(() => {
  const gapId =
    typeof route.query.gap === 'string'
      ? route.query.gap
      : undefined;

  return selectedProject.value?.gaps.find(
    (gap) => gap.id === gapId,
  );
});

const selectedFacet = computed(() => {
  const facetId =
    typeof route.query.facet === 'string'
      ? route.query.facet
      : undefined;

  return selectedGap.value?.facets.find(
    (facet) => facet.id === facetId,
  );
});

const selectedFacetValue = computed(() => {
  if (!selectedFacet.value) {
    return selectedGap.value?.facets.length === 0
      ? 'all'
      : undefined;
  }

  const value =
    typeof route.query.facetValue === 'string'
      ? route.query.facetValue
      : undefined;

  if (value === 'all') {
    return 'all';
  }

  return value && isWikidataEntityId(value)
    ? value
    : undefined;
});

const routeError = computed(() => {
  if (!selectedProject.value) {
    return 'The project in this URL is missing or invalid.';
  }

  if (!selectedGap.value) {
    return 'The gap in this URL is missing or invalid.';
  }

  if (
    selectedGap.value.facets.length === 0 &&
    (route.query.facet !== undefined ||
      route.query.facetValue !== undefined)
  ) {
    return 'This gap does not support a facet.';
  }

  if (selectedGap.value.facets.length > 0 && !selectedFacet.value) {
    return 'The facet in this URL is missing or invalid.';
  }

  if (selectedFacet.value && !selectedFacetValue.value) {
    return 'The facet value in this URL is missing or invalid.';
  }

  return null;
});


const rows = ref<NormalizedRow[]>([]);
const isLoading = ref(false);
const errorMessage = ref<string | null>(null);
const hasRun = ref(false);
const localFilter = ref('');

const hideVisited = ref(false);

const VISITED_ITEMS_KEY = 'dustpan.visited-items.v1';

const visitedItemIds = ref<Set<string>>(loadVisitedItemIds());

function loadVisitedItemIds(): Set<string> {
  try {
    const storedValue = sessionStorage.getItem(VISITED_ITEMS_KEY);

    if (!storedValue) {
      return new Set();
    }

    const parsedValue: unknown = JSON.parse(storedValue);

    if (!Array.isArray(parsedValue)) {
      return new Set();
    }

    return new Set(
      parsedValue.filter(
        (value): value is string =>
          typeof value === 'string' &&
          isWikidataEntityId(value),
      ),
    );
  } catch {
    return new Set();
  }
}

function markItemVisited(row: NormalizedRow): void {
  const itemId = getItemId(row);

  if (!itemId || !isWikidataEntityId(itemId)) {
    return;
  }

  visitedItemIds.value = new Set([
    ...visitedItemIds.value,
    itemId,
  ]);

  sessionStorage.setItem(
    VISITED_ITEMS_KEY,
    JSON.stringify([...visitedItemIds.value]),
  );
}

function isItemVisited(row: NormalizedRow): boolean {
  const itemId = getItemId(row);

  return Boolean(
    itemId && visitedItemIds.value.has(itemId),
  );
}

const filteredRows = computed(() => {
  const filter = localFilter.value.trim().toLowerCase();

  return rows.value.filter((row) => {
    if (hideVisited.value && isItemVisited(row)) {
      return false;
    }

    if (!filter) {
      return true;
    }

    const itemId = getItemId(row)?.toLowerCase() ?? '';
    const label = getItemLabel(row).toLowerCase();

    return itemId.includes(filter) || label.includes(filter);
  });
});

const resultCount = computed(() => filteredRows.value.length);

const resultColumns = computed(
  () => selectedGap.value?.columns ?? [],
)

const tableColumns = computed(() =>
  resultColumns.value.map((column) => ({
    id: column.id,
    label: column.labelKey,
  })),
)

const tableData = computed(() =>
  filteredRows.value.map((row) =>
    Object.fromEntries(
      resultColumns.value.map((column) => {
        const binding = row[column.variable]
        const value = binding?.value ?? ''

        if (column.type !== 'item') {
          return [column.id, { text: value }]
        }

        return [
          column.id,
          {
            text: getItemLabel(row),
            url: value,
            visited: isItemVisited(row),
            sourceRow: row,
          },
        ]
      }),
    ),
  ),
)

function confirmDraftSearch(): void {
  if (!draftProject.value || !draftGap.value) {
    return
  }

  if (draftGap.value.facets.length > 0 && !draftFacet.value) {
    return
  }

  void router.push({
    name: 'results',
    query: {
      project: draftProject.value.id,
      gap: draftGap.value.id,
      ...(draftFacet.value
        ? {
            facet: draftFacet.value.id,
            facetValue: draftFacetValue.value,
          }
        : {}),
    },
  })
}

async function runQuery(): Promise<void> {
  if (
    routeError.value ||
    !selectedGap.value ||
    !selectedFacetValue.value
  ) {
    errorMessage.value =
      routeError.value ?? 'The query state is incomplete.';
    return;
  }

  isLoading.value = true;
  errorMessage.value = null;
  hasRun.value = true;

  try {
    const query = buildGapQuery({
      gap: selectedGap.value,
      facet: selectedFacet.value,
      facetValue: selectedFacetValue.value,
      labelLanguage: 'en',
    });

    const rawResults = await executeQuery(query);
    rows.value = normalizeResults(rawResults);
  } catch (error) {
    rows.value = [];
    errorMessage.value =
      error instanceof Error
        ? error.message
        : 'An unknown error occurred.';
  } finally {
    isLoading.value = false;
  }
}

watch(
  () => route.fullPath,
  () => {
    if (routeError.value) {
      rows.value = []
      hasRun.value = false
      errorMessage.value = null
      return
    }

    void runQuery()
  },
  { immediate: true },
)

function getItemUrl(row: NormalizedRow): string | undefined {
  return row.item?.value;
}

function getItemLabel(row: NormalizedRow): string {
  return (
    row.itemLabel?.value ??
    getItemId(row) ??
    'Unlabelled item'
  );
}

function getItemId(row: NormalizedRow): string | undefined {
  const url = getItemUrl(row);

  if (!url) {
    return undefined;
  }

  return url.split('/').pop();
}
</script>

<template>
  <main>
    <h1 v-if="selectedProject && selectedGap">
      <a
        :href="selectedProject.wikidataUrl"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ selectedProject.name }}
      </a>
      — {{ selectedGap.labelKey }}
    </h1>
    <h1 v-else>
      Dustpan
    </h1>

    <SearchControls
      v-model:project-id="draftProjectId"
      v-model:gap-id="draftGapId"
      v-model:facet-id="draftFacetId"
      v-model:facet-value="draftFacetValue"
      :projects="wikiProjects"
      :project="draftProject"
      :gap="draftGap"
      :facet-values="draftFacetValues"
      :is-loading-facet-values="isLoadingDraftFacetValues"
      :facet-value-error="draftFacetValueError"
      submit-label="Update results"
      @submit="confirmDraftSearch"
    />

    <CdxProgressBar
      v-if="isLoading"
      aria-label="Loading Wikidata results"
    />

    <p v-if="routeError" role="alert">
      {{ routeError }}
    </p>

    <div v-if="hasRun && !isLoading && !errorMessage">
      <CdxSearchInput
        v-model="localFilter"
        clearable
        placeholder="Filter by QID or label"
        aria-label="Filter loaded results"
      />

      <CdxButton
        action="default"
        weight="quiet"
        :aria-pressed="hideVisited"
        aria-label="Hide visited items"
        @click="hideVisited = !hideVisited"
      >
        <CdxIcon :icon="hideVisited ? cdxIconEyeClosed : cdxIconEye" />
        Hide visited
      </CdxButton>
    </div>



    <p v-if="errorMessage" role="alert">
      {{ errorMessage }}
    </p>

    <p v-else-if="hasRun && !isLoading">
      {{ resultCount }} results
    </p>

    <CdxTable
      v-if="!isLoading && filteredRows.length > 0"
      caption="Wikidata search results"
      :columns="tableColumns"
      :data="tableData"
    >
      <template
        v-for="column in resultColumns"
        :key="column.id"
        #[`item-${column.id}`]="{ item }"
      >
        <template v-if="column.type === 'item'">
          <a
            v-if="item.url"
            :href="item.url"
            target="_blank"
            rel="noopener noreferrer"
            @click="markItemVisited(item.sourceRow)"
          >
            {{ item.text }}
          </a>

          <span v-else>
            {{ item.text }}
          </span>

          <span v-if="item.visited">
            — Visited
          </span>
        </template>

        <template v-else>
          {{ item.text }}
        </template>
      </template>
    </CdxTable>

    <p
      v-else-if="
        hasRun &&
        !isLoading &&
        !errorMessage &&
        rows.length === 0
      "
    >
      No results found.
    </p>

    <p
      v-else-if="
        hasRun &&
        !isLoading &&
        !errorMessage &&
        filteredRows.length === 0
      "
    >
      No loaded results match the current filters.
    </p>
  </main>
</template>