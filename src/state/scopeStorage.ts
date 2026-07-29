/**
 * SPDX-License-Identifier: GPL-2.0-or-later
 *
 * Dustpan
 * A tool to uncover WikiProjects that can be improved on Wikidata
 * @see https://github.com/wikicollabs/dustpan
 *
 * Scope value memory: remembers the last value picked per scopeId
 * (e.g. "geographicScope"), globally across wikiprojects/query types.
 * Picking "all" (null) is itself a remembered state, not a reset.
 *
 * Single localStorage key holding a { [scopeId]: qidOrNull } map,
 * instead of one key per scope, to avoid key sprawl as scopes grow.
 */

type ScopeValueMap = Record<string, string | null>;

const STORAGE_KEY = 'dustpan_last_scope_values';

function readAll(): ScopeValueMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('[Dustpan] failed to read scope memory, resetting:', err);
    return {};
  }
}

function writeAll(map: ScopeValueMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.error('[Dustpan] failed to write scope memory:', err);
  }
}

// returns the remembered qid for this scopeId, or null if none
// (covers both "never picked anything" and "user explicitly picked all")
export function getLastScopeValue(scopeId: string): string | null {
  const map = readAll();
  return Object.prototype.hasOwnProperty.call(map, scopeId) ? map[scopeId] : null;
}

// qid may be null (user picked "all"). that overwrites memory too
export function setLastScopeValue(scopeId: string, qid: string | null): void {
  const map = readAll();
  map[scopeId] = qid;
  writeAll(map);
}