/**
 * SPDX-License-Identifier: GPL-2.0-or-later
 *
 * Dustpan
 * A tool to uncover WikiProjects that can be improved on Wikidata
 * @see https://github.com/wikicollabs/dustpan
 */

const WDQS_ENDPOINT = 'https://query.wikidata.org/sparql';

export async function runSparqlForScope(
  sparql: string,
  timeoutMs = 60000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = new URL(WDQS_ENDPOINT);
    url.searchParams.set('query', sparql);
    url.searchParams.set('format', 'json');

    return await fetch(url, {
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function runSparqlQuery(sparql: string, timeoutMs = 60000): Promise<Response> {
  const startTime = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(WDQS_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/sparql-results+json',
        'Content-Type': 'application/sparql-query',
      },
      body: sparql,
      signal: controller.signal,
    });
    const durationMs = performance.now() - startTime;
    console.log(`[Dustpan] SPARQL query took ${durationMs.toFixed(1)}ms (status: ${response.status})`);
    return response;
  } catch (err) {
    const durationMs = performance.now() - startTime;
    if (err instanceof Error && err.name === 'AbortError') {
      console.error(`[Dustpan] SPARQL query timed out after ${durationMs.toFixed(1)}ms`);
      throw new Error('Query timed out. The dataset may be too large or the server is busy.');
    }
    console.error(`[Dustpan] SPARQL query network error after ${durationMs.toFixed(1)}ms:`, err);
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
