/**
 * SPDX-License-Identifier: GPL-2.0-or-later
 *
 * Dustpan
 * A tool to uncover WikiProjects that can be improved on Wikidata
 * @see https://github.com/wikicollabs/dustpan
 *
 * Search store: owns view state, selected wikiproject/query type,
 * search execution, and results.
 *
 * Deliberately does NOT own scope state. That's ScopeSelect.vue's job
 * (query/fetchScopeOptions.ts + state/scopeStorage.ts). This store only
 * receives a scope value at search-time, as a plain argument to
 * executeSearch(), same as getQuerySparql's scopeQid.
 *
 * Deliberately does NOT own toast/i18n side effects (language-change
 * toast, $i18n). Those stay in App.vue, they need Vue component
 * context (useToast(), $i18n) that's awkward to import into a store.
 */
import { defineStore } from 'pinia';
import { getQuerySparql } from '../query/queries';
import { runSparqlQuery } from '../query/sparqlClient';
import { writeStateToUrl } from './urlState';
import type { AppUrlState, SparqlBindingValue } from '../types/types';

// this query's SELECT ?item ?itemLabel: item is always bound (main
// query var), itemLabel comes from SERVICE wikibase:label and is
// treated as optional here.
interface ResultBinding {
  item: SparqlBindingValue;
  itemLabel?: SparqlBindingValue;
}

interface ResultSparqlResponse {
  head: { vars: string[] };
  results: { bindings: ResultBinding[] };
}

export interface SearchResultItem {
  itemId: string;
  label: string;
}

function getAutoLanguage(): string {
  const browserLang = navigator.language || navigator.languages?.[0];
  return browserLang.split('-')[0].toLowerCase();
}

function getDisplayLanguage(): string {
  return localStorage.getItem('locale') || getAutoLanguage();
}

function logSearch(querystring: string): void {
  fetch('/api/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ querystring }),
  }).catch((err) => console.error('Failed to log search:', err));
}

export const useSearchStore = defineStore('search', {
  state: () => ({
    currentView: 'landing' as AppUrlState['view'],
    selectedWikiproject: null as string | null,
    selectedQueryId: null as string | null,
    searchedWikiproject: null as string | null,
    searchedQueryId: null as string | null,
    isLoading: false,
    error: null as string | null,
    connectionError: false,
    results: [] as SearchResultItem[],
  }),
  actions: {
    // called from App.vue's popstate handler
    setView(view: AppUrlState['view']) {
      this.currentView = view;
    },
    goHome() {
      this.currentView = 'landing';
      writeStateToUrl({ view: 'landing', wikiproject: '', queryId: null, scope: null });
    },
    saveLastSearch() {
      localStorage.setItem('dustpan_last_project', this.selectedWikiproject ?? '');
      localStorage.setItem('dustpan_last_query', this.selectedQueryId ?? '');
    },
    // only project + query id are restored here, not scope
    restoreLastSearch() {
      const savedProject = localStorage.getItem('dustpan_last_project');
      const savedQuery = localStorage.getItem('dustpan_last_query');
      if (savedProject) this.selectedWikiproject = savedProject;
      if (savedQuery) this.selectedQueryId = savedQuery;
    },
    // scopeValue: qid string or null, passed in by the caller (App.vue reads
    // it off ScopeSelect's v-model at call-time). store doesn't fetch/remember it.
    async executeSearch(scopeValue: string | null = null) {
      if (!this.selectedQueryId) {
        this.error = 'Query not found.';
        return;
      }
      const displayLang = getDisplayLanguage();
      const querySparql = getQuerySparql(this.selectedQueryId, scopeValue, 1000, displayLang);
      if (!querySparql) {
        this.error = 'Query not found.';
        return;
      }
      this.searchedWikiproject = this.selectedWikiproject;
      this.searchedQueryId = this.selectedQueryId;
      this.saveLastSearch();
      this.error = null;
      this.connectionError = false;
      this.isLoading = true;
      writeStateToUrl(
        {
          view: 'search',
          wikiproject: this.selectedWikiproject ?? '',
          queryId: this.selectedQueryId,
          scope: scopeValue,
        },
        { replace: this.currentView === 'search' }
      );
      logSearch(window.location.pathname + window.location.search);
      this.currentView = 'search';
      this.results = [];
      try {
        const response = await runSparqlQuery(querySparql);
        if (!response.ok) throw new Error('Query failed');
        // SPARQL JSON results shape modeled in ResultSparqlResponse above.
        const data: ResultSparqlResponse = await response.json();
        this.results = data.results.bindings.map((binding) => ({
          itemId: binding.item.value.split('/').pop() ?? binding.item.value,
          label: binding.itemLabel?.value || '',
        }));
      } catch (err) {
        console.error('Query error:', err);
        this.connectionError = true;
      } finally {
        this.isLoading = false;
      }
    },
  },
});