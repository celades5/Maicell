export const COMPONENT_ROLES = ['consumer', 'service', 'producer'] as const;

export type ComponentRole = (typeof COMPONENT_ROLES)[number];

export const LIBRARY_INDEX_BY_ROLE = {
  consumer: 'consumer_index',
  service: 'services_index',
  producer: 'producer_index',
} as const satisfies Record<ComponentRole, string>;

export const ALLOWED_COMPONENTS = {
  'myesb-cron-consumer': {
    role: 'consumer',
    schemaFile: 'myesb-cron-consumerType.json',
  },
  'myesb-filereader-service': {
    role: 'service',
    schemaFile: 'myesb-filereader-serviceType.json',
  },
  'myesb-xml2json-transformer': {
    role: 'service',
    schemaFile: 'myesb-xml2json-transformerType.json',
  },
  'myesb-file-producer': {
    role: 'producer',
    schemaFile: 'myesb-file-producerType.json',
  },
} as const satisfies Record<
  string,
  {
    role: ComponentRole;
    schemaFile: string;
  }
>;

export type AllowedComponentId = keyof typeof ALLOWED_COMPONENTS;

export const ALLOWED_COMPONENT_IDS = Object.keys(
  ALLOWED_COMPONENTS,
) as AllowedComponentId[];
