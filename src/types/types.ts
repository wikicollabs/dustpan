/**
 * SPDX-License-Identifier: GPL-2.0-or-later
 *
 * Dustpan
 * A tool to uncover WikiProjects that can be improved on Wikidata
 * @see https://github.com/wikicollabs/dustpan
 */

export interface ScopePath {
  sourcePid?: string;
  scopePid: string;
  scopePidAlt?: string;
}

export interface Scope {
  scopeId: string;
  path: ScopePath;
}

export interface QueryType {
  id: string;
  name: string;
  missingPid: string;
  contributionSummary: string;
  contributionDetails: string;
  example?: { subject: string; property: string; value: string; qid: string } | null;
  scope?: Scope;
}

export interface WikiProject {
  id: string;
  name: string;
  wikidataUrl: string;
  instanceOf: string[];
  queryTypes: QueryType[];
}

export interface AppUrlState {
  view: 'landing' | 'search';
  wikiproject: string;
  queryId: string;
  scope: string | null;
}

export interface ScopeDef {
  label: string;
  allOptionLabel: string;
  source: string;
  sparqlTemplate: string;
}

export interface ScopeOption {
  value: string;
  label: string;
}

// standard W3C SPARQL 1.1 JSON Results binding value shape
// (https://www.w3.org/TR/sparql11-results-json/) — one bound variable's
// value within a single result row.
export interface SparqlBindingValue {
  type: 'uri' | 'literal' | 'bnode';
  value: string;
  'xml:lang'?: string;
  datatype?: string;
}