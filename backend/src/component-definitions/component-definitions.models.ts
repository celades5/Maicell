import type {
  AllowedComponentId,
  ComponentRole,
} from './component-definitions.constants';

export const CONFIG_FIELD_TYPES = [
  'string',
  'description',
  'boolean',
  'cron',
  'enumeration',
  'textenumeration',
] as const;

export type ConfigFieldType = (typeof CONFIG_FIELD_TYPES)[number];

export interface ConfigFieldOption {
  value: string;
  label: string;
}


export interface ComponentConfigField {
  key: string;
  label: string;
  description: string;
  required: boolean;
  fieldType: ConfigFieldType;
  defaultValue?: string;
  options?: ConfigFieldOption[];
  order: number;
}

/**
 * Normalized component definition returned by GET /api/component-definitions.
 * Merges whitelist role + challenge-library metadata + type schema fields.
 */
export interface ComponentDefinition {
  id: AllowedComponentId;
  name: string;
  description: string;
  category: string;
  role: ComponentRole;
  configFields: ComponentConfigField[];
}

/** Catalog entry shape we read from challenge-library.json indexes. */
export interface LibraryIndexEntry {
  id: string;
  name: string;
  description: string;
  type: string;
  category: string;
  hidden?: boolean;
  deprecated?: boolean;
}

export interface RawSchemaField {
  name: string;
  type?: string;
  use?: string;
  description?: string;
  order?: number;
  appinfo?: {
    fieldType?: string;
    label?: string;
    defaultValue?: string;
    advanced?: boolean;
    dynamic?: boolean;
    enumeration?: Array<{ value?: string }>;
    sequence?: boolean;
    min?: string;
    max?: string;
  };
}

export type RawComponentSchema = Record<string, RawSchemaField>;
export interface MergedComponentSource {
  id: AllowedComponentId;
  name: string;
  description: string;
  category: string;
  type: string;
  role: ComponentRole;
  schema: Readonly<RawComponentSchema>;
}
