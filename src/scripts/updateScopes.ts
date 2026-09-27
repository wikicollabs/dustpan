/**
 * SPDX-License-Identifier: GPL-2.0-or-later
 *
 * Dustpan
 * A tool to uncover WikiProjects that can be improved on Wikidata
 * @see https://github.com/wikicollabs/dustpan
 *
 * Generates catalog/scopeOptions.json: a cache of every scope's selectable
 * values and their labels across every language present in i18n/. Run
 * manually via `pnpm exec tsx src/scripts/updateScopes.ts`, or via the
 * update-scopes GitHub Action.
 *
 * Each scope in catalog/scopes.json defines a sparqlTemplate that binds
 * ?value. The template runs here, at generation time, so the app never
 * queries WDQS just to populate a scope dropdown. Re-run when the set of
 * values or their labels change, or when a scope or language is added.
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import type { ScopeDef } from '../types/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const I18N_DIR = path.join(REPO_ROOT, 'i18n');
const SCOPES_PATH = path.join(REPO_ROOT, 'catalog', 'scopes.json');
const OUTPUT_PATH = path.join(REPO_ROOT, 'catalog', 'scopeOptions.json');

const WDQS_ENDPOINT = 'https://query.wikidata.org/sparql';
const USER_AGENT = 'dustpan-updateScopes/1.0 (https://github.com/wikicollabs/dustpan)';

// Message documentation for translators, not a display language.
const NON_DISPLAY_LANGS = new Set(['qqq']);

type ValueLabels = Record<string, string>; // lang code -> label
type ScopeOptionsCache = Record<string, Record<string, ValueLabels>>; // scopeId -> QID -> labels

// Lang codes = i18n/*.json filenames, minus extension, always including en.
function collectLangCodes(): string[] {
  const langs = readdirSync(I18N_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .filter((lang) => !NON_DISPLAY_LANGS.has(lang));
  return [...new Set([...langs, 'en'])].sort();
}

interface LabelBinding {
  value: { value: string };
  label?: { value: string; 'xml:lang'?: string };
}

interface LabelSparqlResponse {
  results: { bindings: LabelBinding[] };
}

// Runs a scope's template and returns every bound value with its labels
// in the requested languages. One row per value per label language.
async function fetchScopeLabels(
  template: string,
  langs: string[]
): Promise<Record<string, ValueLabels>> {
  const langFilter = langs.map((lang) => `"${lang}"`).join(', ');
  const sparql = `
  SELECT ?value ?label WHERE {
    ${template}
    OPTIONAL { ?value rdfs:label ?label . FILTER(LANG(?label) IN (${langFilter})) }
  }`;

  const res = await fetch(WDQS_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/sparql-results+json',
      'Content-Type': 'application/sparql-query',
      'User-Agent': USER_AGENT,
    },
    body: sparql,
  });
  if (!res.ok) {
    throw new Error(`WDQS request failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as LabelSparqlResponse;

  const labelsByQid: Record<string, ValueLabels> = {};
  for (const binding of data.results.bindings) {
    const qid = binding.value.value.split('/').pop() ?? binding.value.value;
    labelsByQid[qid] ??= {};
    const lang = binding.label?.['xml:lang'];
    if (binding.label && lang) {
      labelsByQid[qid][lang] = binding.label.value;
    }
  }
  return labelsByQid;
}

// Fallback chain matches updateProperties.ts: pref-lang -> en -> raw QID.
function resolveLabel(rawLabels: ValueLabels, lang: string, qid: string): string {
  return rawLabels[lang] ?? rawLabels.en ?? qid;
}

// Numeric QID order keeps diffs between runs stable and readable.
function compareQids(a: string, b: string): number {
  return a.localeCompare(b, 'en', { numeric: true });
}

async function main() {
  const scopes = JSON.parse(readFileSync(SCOPES_PATH, 'utf-8')) as Record<string, ScopeDef>;
  const langs = collectLangCodes();

  console.log(`found ${Object.keys(scopes).length} scope(s) in catalog/scopes.json`);
  console.log(`found ${langs.length} languages in i18n/: ${langs.join(', ')}`);

  const cache: ScopeOptionsCache = {};
  for (const [scopeId, scopeDef] of Object.entries(scopes)) {
    // Fail loudly rather than write a cache missing a scope, which would
    // leave that scope's dropdown empty in the app.
    if (scopeDef.source !== 'wikidata-query') {
      throw new Error(`scope "${scopeId}" has unsupported source: ${scopeDef.source}`);
    }

    const rawLabelsByQid = await fetchScopeLabels(scopeDef.sparqlTemplate, langs);
    const qids = Object.keys(rawLabelsByQid).sort(compareQids);
    if (qids.length === 0) {
      throw new Error(`scope "${scopeId}" returned no values, refusing to write an empty cache`);
    }

    cache[scopeId] = {};
    for (const qid of qids) {
      cache[scopeId][qid] = {};
      for (const lang of langs) {
        cache[scopeId][qid][lang] = resolveLabel(rawLabelsByQid[qid], lang, qid);
      }
    }
    console.log(`${scopeId}: ${qids.length} values`);
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf-8');
  console.log(`wrote ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});