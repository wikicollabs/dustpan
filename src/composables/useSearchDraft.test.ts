import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { wikiProjects } from '../catalog'
import { loadFacetValues } from '../query/facet-values'
import { useSearchDraft } from './useSearchDraft'

vi.mock('../query/facet-values', () => ({
  loadFacetValues: vi.fn(),
}))

const mockedLoadFacetValues = vi.mocked(loadFacetValues)

describe('useSearchDraft', () => {
  beforeEach(() => {
    mockedLoadFacetValues.mockReset()
    mockedLoadFacetValues.mockResolvedValue([])

    const storage = new Map<string, string>()

    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value)
      },
      removeItem: (key: string) => {
        storage.delete(key)
      },
      clear: () => {
        storage.clear()
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('resolves the initial project, gap, and facet', async () => {
    const project = wikiProjects[0]
    const gap = project?.gaps[0]
    const facet = gap?.facets[0]

    const draft = useSearchDraft({
      projectId: project?.id,
      gapId: gap?.id,
      facetId: facet?.id,
      facetValue: facet?.defaultValue,
    })

    await flushPromises()

    expect(draft.project.value).toBe(project)
    expect(draft.gap.value).toBe(gap)
    expect(draft.facet.value).toBe(facet)
  })

  it('resets the gap when the project changes', async () => {
    const firstProject = wikiProjects[0]
    const secondProject = wikiProjects[1]

    if (!firstProject || !secondProject) {
      return
    }

    const draft = useSearchDraft({
      projectId: firstProject.id,
      gapId: firstProject.gaps[0]?.id,
      facetId: firstProject.gaps[0]?.facets[0]?.id,
    })

    draft.projectId.value = secondProject.id

    await flushPromises()

    expect(draft.gapId.value).toBe(
      secondProject.gaps[0]?.id ?? '',
    )
  })

  it('resets the facet when the gap changes', async () => {
    const project = wikiProjects.find(
      (candidate) => candidate.gaps.length > 1,
    )

    if (!project) {
      return
    }

    const firstGap = project.gaps[0]
    const secondGap = project.gaps[1]

    const draft = useSearchDraft({
      projectId: project.id,
      gapId: firstGap?.id,
      facetId: firstGap?.facets[0]?.id,
    })

    draft.gapId.value = secondGap?.id ?? ''

    await flushPromises()

    expect(draft.facetId.value).toBe(
      secondGap?.facets[0]?.id ?? '',
    )
  })

  it('loads values for the active facet', async () => {
    const project = wikiProjects[0]
    const gap = project?.gaps[0]
    const facet = gap?.facets[0]

    if (!project || !gap || !facet) {
      return
    }

    mockedLoadFacetValues.mockResolvedValue([
      {
        id: 'Q252',
        label: 'Indonesia',
      },
    ])

    const draft = useSearchDraft({
      projectId: project.id,
      gapId: gap.id,
      facetId: facet.id,
      facetValue: 'all',
    })

    await flushPromises()

    expect(mockedLoadFacetValues).toHaveBeenCalledWith(
      facet.values,
    )

    expect(draft.facetValues.value).toEqual([
      {
        id: 'Q252',
        label: 'Indonesia',
      },
    ])
  })

  it('preserves a requested facet value when it is available', async () => {
    const project = wikiProjects[0]
    const gap = project?.gaps[0]
    const facet = gap?.facets[0]

    if (!project || !gap || !facet) {
      return
    }

    mockedLoadFacetValues.mockResolvedValue([
      {
        id: 'Q252',
        label: 'Indonesia',
      },
    ])

    const draft = useSearchDraft({
      projectId: project.id,
      gapId: gap.id,
      facetId: facet.id,
      facetValue: 'Q252',
    })

    await flushPromises()

    expect(draft.facetValue.value).toBe('Q252')
  })

  it('falls back when a requested facet value is unavailable', async () => {
    const project = wikiProjects[0]
    const gap = project?.gaps[0]
    const facet = gap?.facets[0]

    if (!project || !gap || !facet) {
      return
    }

    mockedLoadFacetValues.mockResolvedValue([])

    const draft = useSearchDraft({
      projectId: project.id,
      gapId: gap.id,
      facetId: facet.id,
      facetValue: 'Q252',
    })

    await flushPromises()

    expect(draft.facetValue.value).toBe(
      facet.defaultValue,
    )
  })
})