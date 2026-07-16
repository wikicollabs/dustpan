import { describe, expect, it } from 'vitest';
import type { SparqlResults } from './client';
import { normalizeResults } from './normalize';

describe('normalizeResults', () => {
  it('normalizes WDQS bindings using declared variables', () => {
    const results: SparqlResults = {
      head: {
        vars: ['item', 'itemLabel'],
      },
      results: {
        bindings: [
          {
            item: {
              type: 'uri',
              value: 'http://www.wikidata.org/entity/Q123',
            },
            itemLabel: {
              type: 'literal',
              value: 'Example podcast',
              'xml:lang': 'en',
            },
          },
        ],
      },
    };

    expect(normalizeResults(results)).toEqual([
      {
        item: {
          type: 'uri',
          value: 'http://www.wikidata.org/entity/Q123',
          datatype: undefined,
          language: undefined,
        },
        itemLabel: {
          type: 'literal',
          value: 'Example podcast',
          datatype: undefined,
          language: 'en',
        },
      },
    ]);
  });

  it('represents missing optional bindings as undefined', () => {
    const results: SparqlResults = {
      head: {
        vars: ['item', 'itemLabel'],
      },
      results: {
        bindings: [
          {
            item: {
              type: 'uri',
              value: 'http://www.wikidata.org/entity/Q123',
            },
          },
        ],
      },
    };

    const rows = normalizeResults(results);

    expect(rows[0]?.itemLabel).toBeUndefined();
  });
});