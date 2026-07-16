<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  CdxButton,
  CdxLookup,
  CdxField,
  CdxSelect,
} from '@wikimedia/codex'
import type { MenuItemData } from '@wikimedia/codex'
import type {
  FacetValue,
  GapDefinition,
  WikiProjectDefinition,
  WikidataEntityId,
} from '../../types/catalog'

const props = defineProps<{
  projects: WikiProjectDefinition[]
  project?: WikiProjectDefinition
  gap?: GapDefinition
  facetValues: FacetValue[]
  isLoadingFacetValues: boolean
  facetValueError: string | null
  submitLabel: string
}>()

const projectId = defineModel<string>('projectId', {
  required: true,
})

const gapId = defineModel<string>('gapId', {
  required: true,
})

const facetId = defineModel<string>('facetId', {
  required: true,
})

const facetValue = defineModel<'all' | WikidataEntityId | null>(
  'facetValue',
  {
    required: true,
  },
)

const emit = defineEmits<{
  submit: []
}>()

function submitSearch(): void {
  if (!canSubmit.value) {
    return
  }

  emit('submit')
}

const projectMenuItems = computed<MenuItemData[]>(() =>
  props.projects.map((catalogProject) => ({
    label: catalogProject.name,
    value: catalogProject.id,
  })),
)

const projectInputValue = ref('')

watch(
  [projectId, () => props.projects],
  () => {
    projectInputValue.value =
      props.projects.find(
        (catalogProject) => catalogProject.id === projectId.value,
      )?.name ?? ''
  },
  { immediate: true },
)

const filteredProjectMenuItems = computed<MenuItemData[]>(() => {
  const query = projectInputValue.value.trim().toLowerCase()

  if (!query) {
    return projectMenuItems.value
  }

  return projectMenuItems.value.filter((item) =>
    item.label?.toLowerCase().includes(query),
  )
})

const gapMenuItems = computed<MenuItemData[]>(() =>
  (props.project?.gaps ?? []).map((catalogGap) => ({
    label: catalogGap.labelKey,
    value: catalogGap.id,
  })),
)

const gapInputValue = ref('')

watch(
  [gapId, () => props.project],
  () => {
    gapInputValue.value =
      props.project?.gaps.find(
        (catalogGap) => catalogGap.id === gapId.value,
      )?.labelKey ?? ''
  },
  { immediate: true },
)

const filteredGapMenuItems = computed<MenuItemData[]>(() => {
  const query = gapInputValue.value.trim().toLowerCase()

  if (!query) {
    return gapMenuItems.value
  }

  return gapMenuItems.value.filter((item) =>
    item.label?.toLowerCase().includes(query),
  )
})

const facetMenuItems = computed<MenuItemData[]>(() =>
  (props.gap?.facets ?? []).map((catalogFacet) => ({
    label: catalogFacet.labelKey,
    value: catalogFacet.id,
  })),
)

const activeFacet = computed(() =>
  props.gap?.facets.find(
    (catalogFacet) => catalogFacet.id === facetId.value,
  ),
)

const facetValueMenuItems = computed<MenuItemData[]>(() => [
  {
    label: 'All',
    value: 'all',
  },
  ...props.facetValues.map((value) => ({
    label: 'label' in value ? value.label : value.labelKey,
    value: value.id,
  })),
])

const facetValueInputValue = ref('')

watch(
  [facetValue, facetValueMenuItems, activeFacet],
  () => {
    facetValueInputValue.value =
      facetValueMenuItems.value.find(
        (item) => item.value === facetValue.value,
      )?.label ?? ''
  },
  { immediate: true },
)

const filteredFacetValueMenuItems = computed<MenuItemData[]>(() => {
  const query = facetValueInputValue.value.trim().toLowerCase()

  if (!query) {
    return facetValueMenuItems.value
  }

  return facetValueMenuItems.value.filter((item) =>
    item.label?.toLowerCase().includes(query) ||
    String(item.value).toLowerCase().includes(query),
  )
})

const facetValueFieldStatus = computed(() =>
  props.facetValueError ? 'error' : 'default',
)

const facetValueFieldMessages = computed(() => ({
  error: props.facetValueError ?? '',
}))

const canSubmit = computed(() => {
  if (!props.project || !props.gap) {
    return false
  }

  if (props.gap.facets.length > 0) {
    return (
      Boolean(activeFacet.value) &&
      facetValue.value !== null &&
      !props.isLoadingFacetValues &&
      props.facetValueError === null
    )
  }

  return true
})

function updateProjectInput(value: string): void {
  projectInputValue.value = value

  const selectedLabel = props.projects.find(
    (catalogProject) => catalogProject.id === projectId.value,
  )?.name

  if (value !== selectedLabel) {
    projectId.value = ''
  }
}

function updateGapInput(value: string): void {
  gapInputValue.value = value

  const selectedLabel = props.project?.gaps.find(
    (catalogGap) => catalogGap.id === gapId.value,
  )?.labelKey

  if (value !== selectedLabel) {
    gapId.value = ''
  }
}

function updateFacetValueInput(value: string): void {
  facetValueInputValue.value = value

  const selectedLabel = facetValueMenuItems.value.find(
    (item) => item.value === facetValue.value,
  )?.label

  if (value !== selectedLabel) {
    facetValue.value = null
  }
}

</script>

<template>
  <form
    class="search-controls"
    @submit.prevent="submitSearch"
  >
  <CdxField>
    <CdxLookup
      v-model:selected="projectId"
      :input-value="projectInputValue"
      @update:input-value="updateProjectInput"
      :menu-items="filteredProjectMenuItems"
      placeholder="Select or search for a WikiProject"
    >
      <template #no-results>
        No WikiProjects found.
      </template>
    </CdxLookup>

    <template #label>
      WikiProject
    </template>
  </CdxField>

  <CdxField>
    <CdxLookup
      v-model:selected="gapId"
      :input-value="gapInputValue"
      @update:input-value="updateGapInput"
      :menu-items="filteredGapMenuItems"
      :disabled="!project || project.gaps.length === 0"
      placeholder="Select or search for a gap type"
    >
      <template #no-results>
        No gap types found.
      </template>
    </CdxLookup>

    <template #label>
      Gap type
    </template>
  </CdxField>

  <CdxField v-if="gap && gap.facets.length > 1">
    <CdxSelect
      v-model:selected="facetId"
      :menu-items="facetMenuItems"
      default-label="Select a facet"
    />

    <template #label>
      Facet
    </template>
  </CdxField>

  <CdxField
    v-if="activeFacet"
    :status="facetValueFieldStatus"
    :messages="facetValueFieldMessages"
  >
    <CdxLookup
      v-model:selected="facetValue"
      :input-value="facetValueInputValue"
      @update:input-value="updateFacetValueInput"
      :menu-items="filteredFacetValueMenuItems"
      :disabled="
        isLoadingFacetValues ||
        facetValueError !== null
      "
      placeholder="Select or search for a value"
    >
      <template #no-results>
        No facet values found.
      </template>
    </CdxLookup>

    <template #label>
      {{ activeFacet.labelKey }}
    </template>

    <template
      v-if="isLoadingFacetValues"
      #help-text
    >
      Loading facet values…
    </template>
  </CdxField>

 <CdxField v-else-if="gap && gap.facets.length === 0">
   <CdxSelect
     :selected="null"
     :menu-items="[]"
     default-label="No facet available"
     disabled
   />

   <template #label>
     Facet
   </template>
 </CdxField>

  <CdxButton
    class="search-controls__submit"
    type="submit"
    action="progressive"
    weight="primary"
    :disabled="!canSubmit"
  >
    {{ submitLabel }}
  </CdxButton>
  </form>
</template>

<style scoped>

.search-controls {
  display: grid;
  gap: var(--spacing-100);
}

.search-controls__submit {
  width: 100%;
  justify-content: center;
}

</style>