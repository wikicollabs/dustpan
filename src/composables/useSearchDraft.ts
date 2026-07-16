import { computed, ref, watch } from 'vue'
import type { FacetValue, WikidataEntityId } from '../types/catalog'
import { loadFacetValues } from '../query/facet-values'
import { isWikidataEntityId } from '../query/validators'

import { wikiProjects } from '../catalog'

const FACET_SELECTIONS_KEY = 'dustpan.facet-selections.v1'

type SavedFacetSelections = Record<string, 'all' | WikidataEntityId>

function getFacetSelectionKey(
  projectId: string,
  gapId: string,
  facetId: string,
): string {
  return `${projectId}:${gapId}:${facetId}`
}

function loadSavedFacetSelections(): SavedFacetSelections {
  try {
    const storedValue = sessionStorage.getItem(FACET_SELECTIONS_KEY)

    if (!storedValue) {
      return {}
    }

    const parsedValue: unknown = JSON.parse(storedValue)

    if (
      typeof parsedValue !== 'object' ||
      parsedValue === null ||
      Array.isArray(parsedValue)
    ) {
      return {}
    }

    const selections: SavedFacetSelections = {}

    for (const [key, value] of Object.entries(parsedValue)) {
      if (
        value === 'all' ||
        (
          typeof value === 'string' &&
          isWikidataEntityId(value)
        )
      ) {
        selections[key] = value
      }
    }

    return selections
  } catch {
    return {}
  }
}

export function useSearchDraft(initialState: {
  projectId?: string
  gapId?: string
  facetId?: string
  facetValue?: 'all' | WikidataEntityId
}) {
  const projectId = ref(initialState.projectId ?? '')
  const gapId = ref(initialState.gapId ?? '')
  const facetId = ref(initialState.facetId ?? '')

  const facetValue = ref<'all' | WikidataEntityId>(
    initialState.facetValue ?? 'all',
  )

  const facetValues = ref<FacetValue[]>([])
  const isLoadingFacetValues = ref(false)
  const facetValueError = ref<string | null>(null)

  let facetLoadRequestId = 0
  let requestedFacetValue = initialState.facetValue
  let facetValuesHaveLoaded = false

  const savedFacetSelections = ref<SavedFacetSelections>(
    loadSavedFacetSelections(),
  )

  const project = computed(() =>
    wikiProjects.find(
      (candidate) => candidate.id === projectId.value,
    ),
  )

  const gap = computed(() =>
    project.value?.gaps.find(
      (candidate) => candidate.id === gapId.value,
    ),
  )

  const facet = computed(() =>
    gap.value?.facets.find(
      (candidate) => candidate.id === facetId.value,
    ),
  )

  watch(projectId, () => {
    const gapStillExists = project.value?.gaps.some(
      (candidate) => candidate.id === gapId.value,
    )

    if (!gapStillExists) {
      gapId.value = project.value?.gaps[0]?.id ?? ''
    }
  })

  watch(gapId, () => {
    const facetStillExists = gap.value?.facets.some(
      (candidate) => candidate.id === facetId.value,
    )

    if (!facetStillExists) {
      facetId.value = gap.value?.facets[0]?.id ?? ''
    }
  })

  watch(
    facet,
    async (selectedFacet) => {
      const requestId = ++facetLoadRequestId

      facetValuesHaveLoaded = false
      facetValues.value = []
      facetValueError.value = null
      isLoadingFacetValues.value = false

      if (!selectedFacet || !project.value || !gap.value) {
        facetValue.value = 'all'
        requestedFacetValue = undefined
        return
      }

      const selectionKey = getFacetSelectionKey(
        project.value.id,
        gap.value.id,
        selectedFacet.id,
      )

      const preferredValue =
        requestedFacetValue ??
        savedFacetSelections.value[selectionKey] ??
        selectedFacet.defaultValue

      requestedFacetValue = undefined
      facetValue.value = selectedFacet.defaultValue
      isLoadingFacetValues.value = true

      try {
        const values = await loadFacetValues(
          selectedFacet.values,
        )

        if (requestId !== facetLoadRequestId) {
          return
        }

        facetValues.value = values

        if (
          preferredValue === 'all' ||
          values.some((value) => value.id === preferredValue)
        ) {
          facetValue.value = preferredValue
        }

        facetValuesHaveLoaded = true
      } catch (error) {
        if (requestId !== facetLoadRequestId) {
          return
        }

        facetValueError.value =
          error instanceof Error
            ? error.message
            : 'Failed to load facet values.'
      } finally {
        if (requestId === facetLoadRequestId) {
          isLoadingFacetValues.value = false
        }
      }
    },
    { immediate: true },
  )

  watch(facetValue, (value) => {
    if (
      !facetValuesHaveLoaded ||
      !project.value ||
      !gap.value ||
      !facet.value
    ) {
      return
    }

    if (
      value !== 'all' &&
      !facetValues.value.some(
        (candidate) => candidate.id === value,
      )
    ) {
      return
    }

    const selectionKey = getFacetSelectionKey(
      project.value.id,
      gap.value.id,
      facet.value.id,
    )

    savedFacetSelections.value = {
      ...savedFacetSelections.value,
      [selectionKey]: value,
    }

    sessionStorage.setItem(
      FACET_SELECTIONS_KEY,
      JSON.stringify(savedFacetSelections.value),
    )
  })

  function setState(nextState: {
    projectId?: string
    gapId?: string
    facetId?: string
    facetValue?: 'all' | WikidataEntityId
  }): void {
    requestedFacetValue = nextState.facetValue

    projectId.value = nextState.projectId ?? ''
    gapId.value = nextState.gapId ?? ''
    facetId.value = nextState.facetId ?? ''

    if (nextState.facetValue) {
      facetValue.value = nextState.facetValue
    }
  }

  return {
    projectId,
    gapId,
    facetId,
    project,
    gap,
    facet,
    setState,
    facetValue,
    facetValues,
    isLoadingFacetValues,
    facetValueError,
  }
}