/**
 * SPDX-License-Identifier: GPL-2.0-or-later
 *
 * Dustpan
 * A tool to uncover WikiProjects that can be improved on Wikidata
 * @see https://github.com/wikicollabs/dustpan
 *
 * URL state sync: reads/writes search state to query params so refresh,
 * back/forward, and shared links work.
 *
 * Deliberately dumb: no validation of wikiproject/queryId/scope values
 * against known-good lists. That's ScopeSelect/store's job downstream.
 * This file just moves strings between URLSearchParams and plain objects.
 */

import type { AppUrlState } from '../types/types';

const VALID_VIEWS: AppUrlState['view'][] = ['landing', 'search'];

function parseView(raw: string | null): AppUrlState['view'] {
  return VALID_VIEWS.includes(raw as AppUrlState['view']) ? (raw as AppUrlState['view']) : 'landing';
}

export function readStateFromUrl(): AppUrlState {
  const params = new URLSearchParams(window.location.search);

  return {
    view: parseView(params.get('view')),
    wikiproject: params.get('project') || '',
    queryId: params.get('query') || '',
    scope: params.get('scope') || null,
  };
}

export function writeStateToUrl(state: AppUrlState, { replace = false }: { replace?: boolean } = {}) {
  const params = new URLSearchParams();

  if (state.view && state.view !== 'landing') {
    params.set('view', state.view);
  }
  if (state.wikiproject) params.set('project', state.wikiproject);
  if (state.queryId) params.set('query', state.queryId);
  if (state.scope) params.set('scope', state.scope);

  const query = params.toString();
  const url = query ? `?${query}` : window.location.pathname;

  // no state object passed. single source of truth is the URL itself,
  // re-parsed via readStateFromUrl() on popstate. avoids event.state and
  // the URL drifting out of sync with each other.
  //
  // replace: true for re-searches within the search view (updates URL,
  // no new back-stack entry). false (default/pushState) only for the
  // landing → search transition, so back-button goes to landing once,
  // not through every re-search in between.
  if (replace) {
    history.replaceState(null, '', url);
  } else {
    history.pushState(null, '', url);
  }
}