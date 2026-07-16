export interface SparqlBindingValue {
  type: string;
  value: string;
  datatype?: string;
  ['xml:lang']?: string;
}

export type SparqlBinding = Record<string, SparqlBindingValue>;

export interface SparqlResults {
  head: {
    vars: string[];
  };
  results: {
    bindings: SparqlBinding[];
  };
}

export interface ExecuteQueryOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

const WDQS_ENDPOINT = 'https://query.wikidata.org/sparql';
const DEFAULT_TIMEOUT_MS = 30_000;

export async function executeQuery(
  query: string,
  {
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  }: ExecuteQueryOptions = {},
): Promise<SparqlResults> {
  if (!query.trim()) {
    throw new Error('SPARQL query must not be empty');
  }

  const timeoutController = new AbortController();
  const timeoutId = window.setTimeout(
    () => timeoutController.abort(),
    timeoutMs,
  );

  const combinedSignal = combineAbortSignals([
    signal,
    timeoutController.signal,
  ]);

  try {
    const response = await fetch(WDQS_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/sparql-results+json',
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: new URLSearchParams({ query }),
      signal: combinedSignal,
    });

    if (!response.ok) {
      throw new Error(
        `WDQS request failed with status ${response.status}`,
      );
    }

    return (await response.json()) as SparqlResults;
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === 'AbortError'
    ) {
      throw new Error('WDQS request timed out or was cancelled', {
        cause: error,
      })
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function combineAbortSignals(
  signals: Array<AbortSignal | undefined>,
): AbortSignal {
  const controller = new AbortController();

  for (const signal of signals) {
    if (!signal) {
      continue;
    }

    if (signal.aborted) {
      controller.abort();
      break;
    }

    signal.addEventListener(
      'abort',
      () => controller.abort(),
      { once: true },
    );
  }

  return controller.signal;
}