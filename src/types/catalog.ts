export type WikidataEntityId = `Q${number}`;
export type WikidataPropertyId = `P${number}`;

export interface WikiProjectDefinition {
  id: string;
  name: string;
  wikidataUrl: string;
  gaps: GapDefinition[];
}

export interface GapDefinition {
  id: string;
  labelKey: string;
  instructionKey: string;
  example?: string;
  query: QueryDefinition;
  columns: ResultColumnDefinition[];
  facets: FacetDefinition[];
}

export interface QueryDefinition {
  selectVariables: string[];
  baseWhere: string;
  orderBy?: string;
  limit?: number;
}

export interface ResultColumnDefinition {
  id: string;
  labelKey: string;
  variable: string;
  type: 'item' | 'text' | 'date' | 'url' | 'image';
  sortable?: boolean;
}

export interface FacetDefinition {
  id: string;
  labelKey: string;
  values: FacetValueSource;
  queryConstraint: FacetQueryConstraint;
  defaultValue: 'all' | WikidataEntityId;
}

export type FacetValue =
  | {
      id: WikidataEntityId;
      labelKey: string;
      label?: never;
    }
  | {
      id: WikidataEntityId;
      label: string;
      labelKey?: never;
    };

export type FacetValueSource =
  | {
      type: 'static';
      values: FacetValue[];
    }
  | {
      type: 'sparql';
      query: string;
      valueVariable: string;
      labelVariable: string;
    };

export type FacetQueryConstraint =
  | {
      type: 'direct-property';
      subjectVariable: string;
      propertyId: WikidataPropertyId;
    }
  | {
      type: 'property-path';
      subjectVariable: string;
      path: WikidataPropertyId[];
    }
  | {
      type: 'named-builder';
      builderId: string;
    };