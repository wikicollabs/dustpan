<script setup lang="ts">
import { useRouter } from 'vue-router'

import { wikiProjects } from '../catalog'
import SearchControls from '../components/search/SearchControls.vue'
import { useSearchDraft } from '../composables/useSearchDraft'

const initialProject = wikiProjects[0]
const initialGap = initialProject?.gaps[0]
const initialFacet = initialGap?.facets[0]

const {
  projectId: selectedProjectId,
  gapId: selectedGapId,
  facetId: selectedFacetId,
  facetValue: selectedFacetValue,
  project,
  gap,
  facet,
  facetValues,
  isLoadingFacetValues,
  facetValueError,
} = useSearchDraft({
  projectId: initialProject?.id,
  gapId: initialGap?.id,
  facetId: initialFacet?.id,
})

const router = useRouter()

function submitSearch(): void {
  if (!project.value || !gap.value) {
    return
  }

  void router.push({
    name: 'results',
    query: {
      project: project.value.id,
      gap: gap.value.id,
      ...(facet.value
        ? {
            facet: facet.value.id,
            facetValue: selectedFacetValue.value,
          }
        : {}),
    },
  })
}
</script>

<template>
  <main>
    <h1>Dustpan</h1>

    <p>Find Wikidata data-quality gaps by WikiProject.</p>

    <SearchControls
      v-model:project-id="selectedProjectId"
      v-model:gap-id="selectedGapId"
      v-model:facet-id="selectedFacetId"
      v-model:facet-value="selectedFacetValue"
      :projects="wikiProjects"
      :project="project"
      :gap="gap"
      :facet-values="facetValues"
      :is-loading-facet-values="isLoadingFacetValues"
      :facet-value-error="facetValueError"
      submit-label="Search"
      @submit="submitSearch"
    />

    <p v-if="wikiProjects.length === 0">
      No configured gaps are available.
    </p>
  </main>
</template>