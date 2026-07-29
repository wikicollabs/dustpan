/**
 * SPDX-License-Identifier: GPL-2.0-or-later
 *
 * Dustpan
 * A tool to uncover WikiProjects that can be improved on Wikidata
 * @see https://github.com/wikicollabs/dustpan
 *
 * Generic SPARQL builder: reads a WikiProject + QueryType (from JSON)
 * and produces the SPARQL query string.
 */

import type { WikiProject, QueryType, Scope } from '../types/types';

// ---- label fallback helpers ----

function labelClause(entityVar: string, labelVar: string, lang: string) {
  const base = labelVar.replace('?', '');
  const langChain: string[] = [];
  if (lang) langChain.push(lang);
  if (!langChain.includes('mul')) langChain.push('mul');
  if (!langChain.includes('en')) langChain.push('en');

  const tierWhere = langChain
    .map((code, i) => `
      OPTIONAL { ${entityVar} rdfs:label ?${base}_${i} . FILTER(LANG(?${base}_${i}) = "${code}") }`)
    .join('');
  const anyWhere = `
      OPTIONAL { ${entityVar} rdfs:label ?${base}_any . }`;

  const aggSelect = langChain.map((_, i) => `(SAMPLE(?${base}_${i}) AS ?${base}_agg${i})`).join(' ')
    + ` (SAMPLE(?${base}_any) AS ?${base}_aggAny)`;

  const aggVars = langChain.map((_, i) => `?${base}_agg${i}`).concat([`?${base}_aggAny`]);

  const finalBind = `
    BIND(COALESCE(${aggVars.join(', ')}, "No label defined") AS ${labelVar})
    BIND(LANG(${labelVar}) AS ${labelVar}_lang)`;

  return { whereClause: tierWhere + anyWhere, aggSelect, finalBind };
}

function limitClause(limit?: number) {
  return limit ? `LIMIT ${limit}` : '';
}

// ---- step 1: which items count as this WikiProject ----
// single instanceOf -> plain triple. multiple -> VALUES.

function instanceOfClause(instanceOf: string[]) {
  if (instanceOf.length === 1) {
    return `?item wdt:P31 wd:${instanceOf[0]} .`;
  }
  const values = instanceOf.map((q) => `wd:${q}`).join(' ');
  return `VALUES ?itemType { ${values} }\n            ?item wdt:P31 ?itemType .`;
}

// ---- step 2: scope filtering ----
// handles all 3 known shapes based on which keys are present in `path`.
// no scope key at all, or no scopeQid selected -> no triple.

function scopeClause(scope: Scope | undefined, scopeQid: string | null | undefined) {
  if (!scope || !scopeQid) return '';
  const { sourcePid, scopePid, scopePidAlt } = scope.path;

  // shape 1: no-hop -> item -[scopePid]-> value
  if (!sourcePid) {
    return `?item wdt:${scopePid} wd:${scopeQid} .`;
  }

  // shape 2: single-hop -> item -[sourcePid]-> node -[scopePid]-> value
  if (!scopePidAlt) {
    return `?item wdt:${sourcePid} ?scopeNode .
            ?scopeNode wdt:${scopePid} wd:${scopeQid} .`;
  }

  // shape 3: single-hop with OR -> node -[scopePid OR scopePidAlt]-> value
  return `?item wdt:${sourcePid} ?scopeNode .
            { ?scopeNode wdt:${scopePid} wd:${scopeQid} . }
            UNION
            { ?scopeNode wdt:${scopePidAlt} wd:${scopeQid} . }`;
}

// ---- main entry point ----
// wikiproject: the WikiProject JSON object (has .instanceOf)
// queryType: the query type JSON object (has .missingPid, .scope)
// scopeQid: the selected scope value's QID, or null if none selected

export function buildQuerySparql(
  wikiproject: WikiProject,
  queryType: QueryType,
  scopeQid?: string | null,
  limit = 1000,
  lang = 'en'
): string {
  const item = labelClause('?item', '?itemLabel', lang);

  const instTriple = instanceOfClause(wikiproject.instanceOf);
  const scopeTriple = scopeClause(queryType.scope, scopeQid);

  return `
  SELECT ?item ?itemLabel ?itemLabel_lang WHERE {
    {
      SELECT ?item ${item.aggSelect} WHERE {
        {
          SELECT ?item WHERE {
            ${instTriple}
            ${scopeTriple}
            MINUS { ?item wdt:${queryType.missingPid} ?exclude . }
          }
          ${limitClause(limit)}
        }
        ${item.whereClause}
      }
      GROUP BY ?item
    }
    ${item.finalBind}
  }`;
}