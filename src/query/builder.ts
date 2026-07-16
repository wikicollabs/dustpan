import type {
  FacetDefinition,
  GapDefinition,
  WikidataEntityId,
} from '../types/catalog';
import { isWikidataEntityId } from './validators';

interface BuildGapQueryOptions {
  gap: GapDefinition;
  facet?: FacetDefinition;
  facetValue: 'all' | WikidataEntityId;
  labelLanguage?: string;
}

const sparqlVariablePattern = /^[A-Za-z_][A-Za-z0-9_]*$/;
const languageCodePattern = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;

export function buildGapQuery({
  gap,
  facet,
  facetValue,
  labelLanguage = 'en',
}: BuildGapQueryOptions): string {
  validateVariableNames(gap.query.selectVariables);

  if (!languageCodePattern.test(labelLanguage)) {
    throw new Error(`Invalid label language: ${labelLanguage}`);
  }

  const facetConstraint = buildFacetConstraint(facet, facetValue);

  const selectClause = gap.query.selectVariables
    .map((variable) => `?${variable}`)
    .join(' ');

  const orderByClause = gap.query.orderBy
    ? `\nORDER BY ${gap.query.orderBy}`
    : '';

  const limitClause =
    gap.query.limit !== undefined
      ? `\nLIMIT ${gap.query.limit}`
      : '';

  return `
PREFIX bd: <http://www.bigdata.com/rdf#>
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>

SELECT ${selectClause} WHERE {
  ${gap.query.baseWhere.trim()}

  ${facetConstraint}

  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "${labelLanguage}".
  }
}${orderByClause}${limitClause}
`.trim();
}

function buildFacetConstraint(
  facet: FacetDefinition | undefined,
  facetValue: 'all' | WikidataEntityId,
): string {
  if (facetValue === 'all') {
    return '';
  }

  if (!facet) {
    throw new Error('A facet value was provided without a facet definition');
  }

  if (!isWikidataEntityId(facetValue)) {
    throw new Error(`Invalid Wikidata entity ID: ${String(facetValue)}`);
  }

  const constraint = facet.queryConstraint;

  switch (constraint.type) {
    case 'direct-property':
      validateVariableName(constraint.subjectVariable);
      return `?${constraint.subjectVariable} wdt:${constraint.propertyId} wd:${facetValue} .`;

    case 'property-path': {
      validateVariableName(constraint.subjectVariable);
      if (constraint.path.length === 0) {
        throw new Error('A property-path constraint must contain at least one property');
      }

      const path = constraint.path
        .map((propertyId) => `wdt:${propertyId}`)
        .join('/');

      return `?${constraint.subjectVariable} ${path} wd:${facetValue} .`;
    }

    case 'named-builder':
      throw new Error(
        `Named facet builder is not implemented: ${constraint.builderId}`,
      );
  }
}

function validateVariableNames(variableNames: string[]): void {
  if (variableNames.length === 0) {
    throw new Error('A query must select at least one variable');
  }

  for (const variableName of variableNames) {
    validateVariableName(variableName);
  }
}

function validateVariableName(variableName: string): void {
  if (!sparqlVariablePattern.test(variableName)) {
    throw new Error(`Invalid SPARQL variable name: ${variableName}`);
  }
}