import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SearchControls from './SearchControls.vue'
import type {
  GapDefinition,
  WikiProjectDefinition,
} from '../../types/catalog'

const gap: GapDefinition = {
  id: 'missing-country',
  labelKey: 'gap-missing-country',
  instructionKey: 'instruction-missing-country',
  query: {
    selectVariables: ['item'],
    baseWhere: '?item wdt:P31 wd:Q5 .',
  },
  columns: [
    {
      id: 'item',
      labelKey: 'column-item',
      variable: 'item',
      type: 'item',
    },
  ],
  facets: [
    {
      id: 'country',
      labelKey: 'facet-country',
      values: {
        type: 'static',
        values: [],
      },
      queryConstraint: {
        type: 'direct-property',
        subjectVariable: 'item',
        propertyId: 'P17',
      },
      defaultValue: 'all',
    },
  ],
}

const noFacetGap: GapDefinition = {
  ...gap,
  id: 'missing-description',
  labelKey: 'gap-missing-description',
  facets: [],
}

const project: WikiProjectDefinition = {
  id: 'people',
  name: 'WikiProject People',
  wikidataUrl: 'https://www.wikidata.org/wiki/Wikidata:WikiProject_People',
  gaps: [gap],
}

describe('SearchControls', () => {
  it('does not submit when the active facet id is invalid', async () => {
    const wrapper = mount(SearchControls, {
      props: {
        projects: [project],
        project,
        gap,
        projectId: project.id,
        gapId: gap.id,
        facetId: 'obsolete-facet',
        facetValue: 'all',
        facetValues: [],
        isLoadingFacetValues: false,
        facetValueError: null,
        submitLabel: 'Search',
      },
    })

    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('does not show the no-facet control when the gap has facets', () => {
    const wrapper = mount(SearchControls, {
      props: {
        projects: [project],
        project,
        gap,
        projectId: project.id,
        gapId: gap.id,
        facetId: 'obsolete-facet',
        facetValue: 'all',
        facetValues: [],
        isLoadingFacetValues: false,
        facetValueError: null,
        submitLabel: 'Search',
      },
    })

    expect(wrapper.text()).not.toContain('No facet available')
  })

  it('submits when the selected facet is valid', async () => {
  const wrapper = mount(SearchControls, {
    props: {
      projects: [project],
      project,
      gap,
      projectId: project.id,
      gapId: gap.id,
      facetId: 'country',
      facetValue: 'all',
      facetValues: [],
      isLoadingFacetValues: false,
      facetValueError: null,
      submitLabel: 'Search',
    },
  })

  await wrapper.get('form').trigger('submit')

  expect(wrapper.emitted('submit')).toHaveLength(1)
})

  it('submits a gap with no facet when the facet value is null', async () => {
  const noFacetProject: WikiProjectDefinition = {
    ...project,
    gaps: [noFacetGap],
  }

  const wrapper = mount(SearchControls, {
    props: {
      projects: [noFacetProject],
      project: noFacetProject,
      gap: noFacetGap,
      projectId: noFacetProject.id,
      gapId: noFacetGap.id,
      facetId: '',
      facetValue: null,
      facetValues: [],
      isLoadingFacetValues: false,
      facetValueError: null,
      submitLabel: 'Search',
    },
  })

  await wrapper.get('form').trigger('submit')

  expect(wrapper.emitted('submit')).toHaveLength(1)
  expect(wrapper.text()).toContain('No facet available')
})

})