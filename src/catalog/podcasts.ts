import type { WikiProjectDefinition } from '../types/catalog';

export const podcastsProject: WikiProjectDefinition = {
  id: 'podcasts',
  name: 'WikiProject Podcasts',
  wikidataUrl:
    'https://www.wikidata.org/wiki/Wikidata:WikiProject_Podcasts',
  gaps: [
    {
      id: 'podcasts-missing-language',
      labelKey: 'gap-podcasts-missing-language',
      instructionKey: 'instruction-podcasts-missing-language',
      example:
        'Example podcast item: add language of work or name (P407) when supported by a reliable source.',
      query: {
        selectVariables: ['item', 'itemLabel'],
        baseWhere: `
          ?item wdt:P31 wd:Q24634210 .
          MINUS {
            ?item wdt:P407 [] .
          }
        `,
        orderBy: '?item',
        limit: 100,
      },
      columns: [
        {
          id: 'item',
          labelKey: 'column-item',
          variable: 'item',
          type: 'item',
          sortable: true,
        },
        {
          id: 'item-label',
          labelKey: 'column-item-label',
          variable: 'itemLabel',
          type: 'text',
          sortable: true,
        },
      ],
      facets: [
        {
          id: 'country-of-origin',
          labelKey: 'facet-country-of-origin',
          values: {
            type: 'sparql',
            query: `
              SELECT DISTINCT ?value ?valueLabel WHERE {
                ?item wdt:P31 wd:Q24634210 .
                ?item wdt:P495 ?value .

                SERVICE wikibase:label {
                  bd:serviceParam wikibase:language "en".
                }
              }
              ORDER BY ?valueLabel
            `,
            valueVariable: 'value',
            labelVariable: 'valueLabel',
          },
          queryConstraint: {
            type: 'direct-property',
            subjectVariable: 'item',
            propertyId: 'P495',
          },
          defaultValue: 'all',
        },
      ],
    },
  ],
};