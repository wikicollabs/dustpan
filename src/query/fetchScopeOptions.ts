/**
 * SPDX-License-Identifier: GPL-2.0-or-later
 *
 * Dustpan
 * A tool to uncover WikiProjects that can be improved on Wikidata
 * @see https://github.com/wikicollabs/dustpan
 *
 * Generic scope options fetcher.
 *
 * scopes.json stores a bare sparqlTemplate (must bind ?value, no label
 * logic). Label handling lives HERE, not in the json, because
 * [AUTO_LANGUAGE] / SERVICE wikibase:label both resolve off the
 * browser's Accept-Language header, which JS can't override, so they
 * silently ignore the app's in-app language switcher. Manual per-lang
 * OPTIONAL clause sidesteps that.
 */

import scopesJson from '../catalog/scopes.json';
import { runSparqlQuery } from '../query/sparqlClient';
import type { ScopeDef, ScopeOption, SparqlBindingValue } from '../types/types';

// scopes.json today only has "geographicScope", but is looked up by
// arbitrary scopeId strings. cast to an index-by-string map rather than
// the narrow literal shape TS would infer from the current json content.
const scopes = scopesJson as Record<string, ScopeDef>;

// manual label clause, bypasses [AUTO_LANGUAGE] / SERVICE wikibase:label
// (both are broken for in-app language switching, see file header)
function labelClause(lang: string): string {
  if (lang && lang !== 'en') {
    return `
    OPTIONAL { ?value rdfs:label ?valueLabel_pref . FILTER(LANG(?valueLabel_pref) = "${lang}") }
    OPTIONAL { ?value rdfs:label ?valueLabel_en . FILTER(LANG(?valueLabel_en) = "en") }
    BIND(COALESCE(?valueLabel_pref, ?valueLabel_en, STR(?value)) AS ?valueLabel)`;
  }
  return `
    OPTIONAL { ?value rdfs:label ?valueLabel_en . FILTER(LANG(?valueLabel_en) = "en") }
    BIND(COALESCE(?valueLabel_en, STR(?value)) AS ?valueLabel)`;
}

// this query's SELECT ?value ?valueLabel: both always bound (valueLabel
// comes from a BIND(COALESCE(...)), not an OPTIONAL, so it's never missing).
interface ScopeBinding {
  value: SparqlBindingValue;
  valueLabel: SparqlBindingValue;
}

interface ScopeSparqlResponse {
  head: { vars: string[] };
  results: { bindings: ScopeBinding[] };
}

// returns [{ value: qid, label: string }], [] on any failure (logged, not thrown,
// callers shouldn't have to try/catch just to render an empty dropdown)
export async function fetchScopeOptions(scopeId: string, lang = 'en'): Promise<ScopeOption[]> {
  const cacheKey = `dustpan_scope_${scopeId}_${lang}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) return JSON.parse(cached);

  const scopeDef = scopes[scopeId];
  if (!scopeDef) {
    console.error(`[Dustpan] unknown scopeId: ${scopeId}`);
    return [];
  }
  if (scopeDef.source !== 'wikidata-query') {
    console.error(`[Dustpan] scope "${scopeId}" has unsupported source: ${scopeDef.source}`);
    return [];
  }

  const sparql = `
  SELECT ?value ?valueLabel WHERE {
    ${scopeDef.sparqlTemplate}${labelClause(lang)}
  } ORDER BY ?valueLabel`;

  try {
    const response = await runSparqlQuery(sparql);
    if (!response.ok) {
      console.error(`[Dustpan] scope fetch for "${scopeId}" failed: server returned`, response.status);
      return [];
    }
    // SPARQL JSON results shape modeled in ScopeSparqlResponse above.
    const data: ScopeSparqlResponse = await response.json();
    const options: ScopeOption[] = data.results.bindings.map((b) => ({
      value: b.value.value.split('/').pop() ?? b.value.value,
      label: b.valueLabel.value,
    }));
    sessionStorage.setItem(cacheKey, JSON.stringify(options));
    return options;
  } catch (err) {
    console.error(`[Dustpan] scope fetch for "${scopeId}" failed:`, err);
    return [];
  }
}