import { describe, expect, it } from 'vitest';
import { podcastsProject } from '../catalog/podcasts';
import type { WikidataEntityId } from '../types/catalog';
import { buildGapQuery } from './builder';

const gap = podcastsProject.gaps[0];
const facet = gap.facets[0];

describe('buildGapQuery', () => {
  it('adds no facet constraint when All is selected', () => {
    const query = buildGapQuery({
      gap,
      facet,
      facetValue: 'all',
    });

    expect(query).toContain('SELECT ?item ?itemLabel');
    expect(query).not.toContain('wdt:P495 wd:');
    expect(query).toContain('LIMIT 100');
  });

  it('adds a direct-property constraint for a specific facet value', () => {
    const query = buildGapQuery({
      gap,
      facet,
      facetValue: 'Q252',
    });

    expect(query).toContain('?item wdt:P495 wd:Q252 .');
  });

  it('rejects an invalid runtime Wikidata entity ID', () => {
    expect(() =>
      buildGapQuery({
        gap,
        facet,
        facetValue: 'Q0' as WikidataEntityId,
      }),
    ).toThrow('Invalid Wikidata entity ID');
  });

  it('rejects an invalid label language', () => {
    expect(() =>
      buildGapQuery({
        gap,
        facet,
        facetValue: 'all',
        labelLanguage: 'en"; DROP EVERYTHING',
      }),
    ).toThrow('Invalid label language');
  });
});