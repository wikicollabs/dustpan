import type {
  WikidataEntityId,
  WikidataPropertyId,
} from '../types/catalog';

const wikidataEntityIdPattern = /^Q[1-9]\d*$/;
const wikidataPropertyIdPattern = /^P[1-9]\d*$/;

export function isWikidataEntityId(
  value: unknown,
): value is WikidataEntityId {
  return (
    typeof value === 'string' &&
    wikidataEntityIdPattern.test(value)
  );
}

export function isWikidataPropertyId(
  value: unknown,
): value is WikidataPropertyId {
  return (
    typeof value === 'string' &&
    wikidataPropertyIdPattern.test(value)
  );
}