/**
 * SPDX-License-Identifier: GPL-2.0-or-later
 *
 * Dustpan
 * A tool to uncover WikiProjects that can be improved on Wikidata
 * @see https://github.com/wikicollabs/dustpan
 */

import { WIKIPROJECTS } from '../catalog/index';
import { buildQuerySparql } from '../query/sparqlBuilder';
import scopesJson from '../catalog/scopes.json';
import type { WikiProject, QueryType, ScopeDef } from '../types/types';

// same pattern as fetchScopeOptions.ts: cast the json import to the
// generic string-indexed map rather than its narrow inferred literal shape
const scopes = scopesJson as Record<string, ScopeDef>;

interface FoundQuery {
  project: WikiProject;
  query: QueryType;
}

interface SelectOption {
  value: string;
  label: string;
}

interface ContributionInfo {
  summaryLabel: string;
  detailsLabel: string;
  example: QueryType['example'];
}

// find a wikiproject by its id
function findWikiproject(projectId: string | null): WikiProject | undefined {
  return WIKIPROJECTS.find((p) => p.id === projectId);
}

// find a query type + its parent wikiproject, by the query type's id
function findQueryType(queryId: string | null): FoundQuery | null {
  for (const project of WIKIPROJECTS) {
    const query = project.queryTypes.find((q) => q.id === queryId);
    if (query) return { project, query };
  }
  return null;
}

// get wikiproject options for CdxCombobox
export function getWikiprojectOptions(): SelectOption[] {
  return WIKIPROJECTS.map((p) => ({ value: p.id, label: p.name }));
}

// get query type options for a given wikiproject, for CdxCombobox
// NOTE: old data had a "group" field for combobox grouping (e.g. "General"),
// unused so far (always empty string). new json has no group field yet.
// flattening into one ungrouped list for now, revisit if grouping is needed later.
export function getQueryOptionsForProject(projectId: string | null): SelectOption[] {
  const project = findWikiproject(projectId);
  if (!project) return [];
  return project.queryTypes.map((q) => ({ value: q.id, label: q.name }));
}

// get all query type ids as flat array (for validation)
export function getAllQueryValues(): string[] {
  return WIKIPROJECTS.flatMap((p) => p.queryTypes.map((q) => q.id));
}

// check if a query type has a scope. Scope is generic, not just geographic.
export function queryHasScope(queryId: string | null): boolean {
  const found = findQueryType(queryId);
  return !!found?.query.scope;
}

// get the scopeId a query type uses, or null if it has none
export function getQueryScopeId(queryId: string | null): string | null {
  const found = findQueryType(queryId);
  return found?.query.scope?.scopeId ?? null;
}

// get the i18n label key for a scopeId (e.g. "search-geographic-label"), or null
export function getScopeLabel(scopeId: string): string | null {
  return scopes[scopeId]?.label ?? null;
}

// get the i18n label key for a scope's "All" menu-item option
// (e.g. "search-scope-all-geographic"), or null
export function getScopeAllOptionLabel(scopeId: string): string | null {
  return scopes[scopeId]?.allOptionLabel ?? null;
}

// get wikiproject name (not translatable) by id
export function getWikiprojectName(projectId: string | null): string {
  return findWikiproject(projectId)?.name ?? projectId ?? '';
}

// get wikiproject wikidata url by id
export function getWikiprojectUrl(projectId: string | null): string {
  return findWikiproject(projectId)?.wikidataUrl
    ?? 'https://www.wikidata.org/wiki/Wikidata:WikiProjects';
}

// get i18n keys + static example for a query type's contribution info message
export function getQueryContributionInfo(queryId: string | null): ContributionInfo | null {
  const found = findQueryType(queryId);
  if (!found) return null;
  const { query } = found;
  return {
    summaryLabel: query.contributionSummary,
    detailsLabel: query.contributionDetails,
    example: query.example ?? null,
  };
}

// build the sparql for a query type, with optional scope value (scopeQid) + limit + lang
export function getQuerySparql(
  queryId: string,
  scopeQid: string | null = null,
  limit = 1000,
  lang = 'en'
): string | null {
  const found = findQueryType(queryId);
  if (!found) return null;
  return buildQuerySparql(found.project, found.query, scopeQid, limit, lang);
}