import type {
  SparqlBindingValue,
  SparqlResults,
} from './client';

export interface NormalizedValue {
  value: string;
  type: string;
  datatype?: string;
  language?: string;
}

export type NormalizedRow = Record<
  string,
  NormalizedValue | undefined
>;

export function normalizeResults(
  results: SparqlResults,
): NormalizedRow[] {
  return results.results.bindings.map((binding) => {
    const row: NormalizedRow = {};

    for (const variable of results.head.vars) {
      row[variable] = normalizeValue(binding[variable]);
    }

    return row;
  });
}

function normalizeValue(
  value: SparqlBindingValue | undefined,
): NormalizedValue | undefined {
  if (!value) {
    return undefined;
  }

  return {
    value: value.value,
    type: value.type,
    datatype: value.datatype,
    language: value['xml:lang'],
  };
}