/**
 * SPDX-License-Identifier: GPL-2.0-or-later
 *
 * Dustpan
 * A tool to uncover WikiProjects that can be improved on Wikidata
 * @see https://github.com/wikicollabs/dustpan
 *
 * Generates catalog/properties.json: a cache of Wikidata property labels
 * (P170, P186, ...) across every language present in i18n/. Run manually
 * via `pnpm exec tsx scripts/updateProperties.ts`, or via the
 * update-properties GitHub Action.
 *
 * Cached rather than fetched live (unlike fetchScopeOptions.ts's scope
 * values) because the property list is small and static, while scope
 * values are dynamic and user-selected. Staleness between cache updates
 * is an accepted tradeoff, not solved here — re-run when property labels
 * drift or a new property/language is added.
 */

import { readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { WIKIPROJECTS } from '../catalog/index';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const I18N_DIR = path.join(REPO_ROOT, 'i18n');
const OUTPUT_PATH = path.join(REPO_ROOT, 'catalog', 'properties.json');

const WBGETENTITIES_ENDPOINT = 'https://www.wikidata.org/w/api.php';
const BATCH_SIZE = 50; // wbgetentities max ids per request

type PropertyLabels = Record<string, string>; // lang code -> label
type PropertiesCache = Record<string, PropertyLabels>; // PID -> PropertyLabels

// TODO: if future query archetypes introduce PID-bearing fields beyond missingPid
// (e.g. multi-property checks or value constraint queries), collect from those
// fields here too, the label cache below is schema agnostic and needs no changes.
// collect every distinct missingPid used across all catalog query types
function collectPropertyIds(): string[] {
  const ids = new Set<string>();
  for (const project of WIKIPROJECTS) {
    for (const query of project.queryTypes) {
      ids.add(query.missingPid);
    }
  }
  return [...ids].sort();
}

// lang codes = i18n/*.json filenames, minus extension
function collectLangCodes(): string[] {
  return readdirSync(I18N_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''));
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

interface WbGetEntitiesResponse {
  entities: Record<string, { labels?: Record<string, { value: string }> }>;
}

// fetch labels for a batch of PIDs, all requested langs in one call
async function fetchLabelBatch(
  pids: string[],
  langs: string[]
): Promise<Record<string, Record<string, string>>> {
  const url = new URL(WBGETENTITIES_ENDPOINT);
  url.searchParams.set('action', 'wbgetentities');
  url.searchParams.set('ids', pids.join('|'));
  url.searchParams.set('props', 'labels');
  url.searchParams.set('languages', [...new Set([...langs, 'en'])].join('|'));
  url.searchParams.set('format', 'json');

  const res = await fetch(url, {
    headers: { 'User-Agent': 'dustpan-updateProperties/1.0 (https://github.com/wikicollabs/dustpan)' },
  });
  if (!res.ok) {
    throw new Error(`wbgetentities request failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as WbGetEntitiesResponse;

  const result: Record<string, Record<string, string>> = {};
  for (const pid of pids) {
    const entity = data.entities[pid];
    const labels = entity?.labels ?? {};
    result[pid] = {};
    for (const [lang, { value }] of Object.entries(labels)) {
      result[pid][lang] = value;
    }
  }
  return result;
}

// fallback chain mirrors fetchScopeOptions.ts's labelClause:
// pref-lang -> en -> raw PID string
function resolveLabel(
  rawLabels: Record<string, string>,
  lang: string,
  pid: string
): string {
  return rawLabels[lang] ?? rawLabels.en ?? pid;
}

async function main() {
  const pids = collectPropertyIds();
  const langs = collectLangCodes();

  console.log(`found ${pids.length} distinct property ids across catalog/`);
  console.log(`found ${langs.length} languages in i18n/: ${langs.join(', ')}`);

  const rawLabelsByPid: Record<string, Record<string, string>> = {};
  for (const batch of chunk(pids, BATCH_SIZE)) {
    const batchResult = await fetchLabelBatch(batch, langs);
    Object.assign(rawLabelsByPid, batchResult);
  }

  const cache: PropertiesCache = {};
  for (const pid of pids) {
    const rawLabels = rawLabelsByPid[pid] ?? {};
    cache[pid] = {};
    for (const lang of langs) {
      cache[pid][lang] = resolveLabel(rawLabels, lang, pid);
    }
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf-8');
  console.log(`wrote ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});