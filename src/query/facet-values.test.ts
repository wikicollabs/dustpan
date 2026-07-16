import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  FacetValueSource,
} from '../types/catalog'
import { executeQuery } from './client'
import { loadFacetValues } from './facet-values'

vi.mock('./client', () => ({
  executeQuery: vi.fn(),
}))

const mockedExecuteQuery = vi.mocked(executeQuery)

describe('loadFacetValues', () => {
  beforeEach(() => {
    mockedExecuteQuery.mockReset()
  })

  it('returns a copy of static facet values', async () => {
    const source: FacetValueSource = {
      type: 'static',
      values: [
        {
          id: 'Q252',
          labelKey: 'facet-value-indonesia',
        },
      ],
    }

    const values = await loadFacetValues(source)

    expect(values).toEqual(source.values)
    expect(values).not.toBe(source.values)
    expect(mockedExecuteQuery).not.toHaveBeenCalled()
  })

  it('loads dynamic facet values from WDQS', async () => {
    const source = createSparqlSource()

    mockedExecuteQuery.mockResolvedValue({
      head: {
        vars: ['value', 'valueLabel'],
      },
      results: {
        bindings: [
          {
            value: {
              type: 'uri',
              value: 'http://www.wikidata.org/entity/Q252',
            },
            valueLabel: {
              type: 'literal',
              value: 'Indonesia',
              'xml:lang': 'en',
            },
          },
        ],
      },
    })

    await expect(loadFacetValues(source)).resolves.toEqual([
      {
        id: 'Q252',
        label: 'Indonesia',
      },
    ])

    if (source.type !== 'sparql') {
      throw new Error('Expected a SPARQL facet value source')
    }

    expect(mockedExecuteQuery).toHaveBeenCalledWith(
      source.query,
      {},
    )
  })

  it.each([
    ['malformed QID', 'http://www.wikidata.org/entity/Q0'],
    ['non-Wikidata URI', 'https://example.com/entity/Q252'],
  ])('rejects a %s returned by WDQS', async (_, entityUri) => {
    mockedExecuteQuery.mockResolvedValue(
      createResults(entityUri, 'Invalid value'),
    )

    await expect(
      loadFacetValues(createSparqlSource()),
    ).resolves.toEqual([])
  })

  it('ignores rows without a label', async () => {
    mockedExecuteQuery.mockResolvedValue({
      head: {
        vars: ['value', 'valueLabel'],
      },
      results: {
        bindings: [
          {
            value: {
              type: 'uri',
              value: 'http://www.wikidata.org/entity/Q252',
            },
          },
        ],
      },
    })

    await expect(
      loadFacetValues(createSparqlSource()),
    ).resolves.toEqual([])
  })

  it('propagates WDQS failures', async () => {
    mockedExecuteQuery.mockRejectedValue(
      new Error('WDQS request failed'),
    )

    await expect(
      loadFacetValues(createSparqlSource()),
    ).rejects.toThrow('WDQS request failed')
  })
})

function createSparqlSource(): FacetValueSource {
  return {
    type: 'sparql',
    query: 'SELECT ?value ?valueLabel WHERE {}',
    valueVariable: 'value',
    labelVariable: 'valueLabel',
  }
}

function createResults(
  entityUri: string,
  label: string,
) {
  return {
    head: {
      vars: ['value', 'valueLabel'],
    },
    results: {
      bindings: [
        {
          value: {
            type: 'uri',
            value: entityUri,
          },
          valueLabel: {
            type: 'literal',
            value: label,
          },
        },
      ],
    },
  }
}