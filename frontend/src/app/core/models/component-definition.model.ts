export type ComponentRole = 'consumer' | 'service' | 'producer';

export type ConfigFieldType =
  | 'string'
  | 'description'
  | 'boolean'
  | 'cron'
  | 'enumeration'
  | 'textenumeration';

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

/** Shape returned by GET /api/component-definitions */
export interface ComponentDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  role: ComponentRole;
  configFields: ComponentConfigField[];
}
