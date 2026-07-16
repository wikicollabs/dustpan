import type {
  FacetValue,
  FacetValueSource,
  WikidataEntityId,
} from '../types/catalog';
import {
  executeQuery,
  type ExecuteQueryOptions,
} from './client';
import { normalizeResults } from './normalize';
import { isWikidataEntityId } from './validators';

const WIKIDATA_ENTITY_PREFIX =
  'http://www.wikidata.org/entity/';

export async function loadFacetValues(
  source: FacetValueSource,
  options: ExecuteQueryOptions = {},
): Promise<FacetValue[]> {
  if (source.type === 'static') {
    return [...source.values];
  }

  const results = await executeQuery(source.query, options);
  const rows = normalizeResults(results);
  const values: FacetValue[] = [];

  for (const row of rows) {
    const entityUri = row[source.valueVariable]?.value;
    const label = row[source.labelVariable]?.value;
    const id = extractEntityId(entityUri);

    if (!id || !label) {
      continue;
    }

    values.push({
      id,
      label,
    });
  }

  return values;
}

function extractEntityId(
  entityUri: string | undefined,
): WikidataEntityId | null {
  if (
    !entityUri ||
    !entityUri.startsWith(WIKIDATA_ENTITY_PREFIX)
  ) {
    return null;
  }

  const id = entityUri.slice(WIKIDATA_ENTITY_PREFIX.length);

  return isWikidataEntityId(id) ? id : null;
}