import { Injectable, Logger } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ALLOWED_COMPONENT_IDS,
  ALLOWED_COMPONENTS,
  LIBRARY_INDEX_BY_ROLE,
  type AllowedComponentId,
} from './component-definitions.constants';
import {
  CONFIG_FIELD_TYPES,
  type ComponentConfigField,
  ComponentDefinition,
  type ConfigFieldOption,
  type ConfigFieldType,
  type LibraryIndexEntry,
  type MergedComponentSource,
  type RawComponentSchema,
  type RawSchemaField,
} from './component-definitions.models';

type JsonObject = Record<string, unknown>;

@Injectable()
export class ComponentDefinitionsService {
  private readonly logger = new Logger(ComponentDefinitionsService.name);
  private readonly definitionsDirectory: string;
  private readonly library: JsonObject;
  private readonly schemas: Readonly<Record<AllowedComponentId, JsonObject>>;
  private readonly mergedSources: readonly MergedComponentSource[];
  private readonly definitions: readonly ComponentDefinition[];

  constructor() {
    this.definitionsDirectory = this.resolveDefinitionsDirectory();
    this.library = this.readJsonObject('challenge-library.json');

    const schemas = {} as Record<AllowedComponentId, JsonObject>;

    for (const componentId of ALLOWED_COMPONENT_IDS) {
      schemas[componentId] = this.readJsonObject(
        ALLOWED_COMPONENTS[componentId].schemaFile,
      );
    }

    this.schemas = Object.freeze(schemas);
    this.mergedSources = this.mergeCatalogMetadata();
    this.definitions = Object.freeze(this.normalizeDefinitions());
    this.logger.log(
      `Loaded challenge-library.json and ${ALLOWED_COMPONENT_IDS.length} component schemas`,
    );
    this.logger.log(
      `Merged metadata and schemas for ${this.mergedSources.length} allowed components`,
    );
  }

  getAll(): readonly ComponentDefinition[] {
    return this.definitions;
  }

  getById(componentId: string): ComponentDefinition | undefined {
    return this.definitions.find((definition) => definition.id === componentId);
  }

  private normalizeDefinitions(): ComponentDefinition[] {
    return this.mergedSources.map((source) => ({
      id: source.id,
      name: source.name,
      description: source.description,
      category: source.category,
      role: source.role,
      configFields: Object.entries(source.schema)
        .filter(([, field]) => this.shouldExposeField(field))
        .map(([key, field]) => this.normalizeField(key, field))
        .sort(
          (left, right) =>
            left.order - right.order || left.key.localeCompare(right.key),
        ),
    }));
  }

  private shouldExposeField(field: RawSchemaField): boolean {
    const appInfo = field.appinfo;

    if (appInfo?.sequence === true) {
      return false;
    }

    if (appInfo?.advanced === true) {
      return false;
    }

    return appInfo?.fieldType !== 'beanreference';
  }

  private normalizeField(
    key: string,
    field: RawSchemaField,
  ): ComponentConfigField {
    const fieldType = this.normalizeFieldType(field.appinfo?.fieldType);
    const defaultValue = field.appinfo?.defaultValue;
    const options = this.normalizeOptions(field.appinfo?.enumeration);

    return {
      key,
      label: field.appinfo?.label || key,
      description: field.description ?? '',
      required: field.use === 'required',
      fieldType,
      ...(defaultValue !== undefined ? { defaultValue } : {}),
      ...(options.length > 0 ? { options } : {}),
      order:
        typeof field.order === 'number' ? field.order : Number.MAX_SAFE_INTEGER,
    };
  }

  private normalizeFieldType(fieldType: string | undefined): ConfigFieldType {
    if (
      fieldType &&
      (CONFIG_FIELD_TYPES as readonly string[]).includes(fieldType)
    ) {
      return fieldType as ConfigFieldType;
    }

    return 'string';
  }

  private normalizeOptions(
    enumeration: Array<{ value?: string }> | undefined,
  ): ConfigFieldOption[] {
    if (!enumeration) {
      return [];
    }

    return enumeration
      .filter(
        (option): option is { value: string } =>
          typeof option.value === 'string',
      )
      .map(({ value }) => ({ value, label: value }));
  }

  private mergeCatalogMetadata(): readonly MergedComponentSource[] {
    return Object.freeze(
      ALLOWED_COMPONENT_IDS.map((componentId) => {
        const allowedComponent = ALLOWED_COMPONENTS[componentId];
        const indexName = LIBRARY_INDEX_BY_ROLE[allowedComponent.role];
        const index = this.requireObject(
          this.library[indexName],
          `challenge-library.json property "${indexName}"`,
        );
        const entry = this.parseLibraryEntry(
          index[componentId],
          `${indexName}.${componentId}`,
        );

        if (entry.id !== componentId) {
          throw new Error(
            `Catalog entry ${indexName}.${componentId} has unexpected id "${entry.id}"`,
          );
        }

        return Object.freeze({
          id: componentId,
          name: entry.name,
          description: entry.description,
          category: entry.category,
          type: entry.type,
          role: allowedComponent.role,
          schema: Object.freeze(
            this.parseRawSchema(this.schemas[componentId], componentId),
          ),
        });
      }),
    );
  }

  private parseLibraryEntry(
    value: unknown,
    context: string,
  ): LibraryIndexEntry {
    const entry = this.requireObject(value, context);

    return {
      id: this.requireString(entry, 'id', context),
      name: this.requireString(entry, 'name', context),
      description: this.requireString(entry, 'description', context),
      type: this.requireString(entry, 'type', context),
      category: this.requireString(entry, 'category', context),
      hidden: typeof entry.hidden === 'boolean' ? entry.hidden : undefined,
      deprecated:
        typeof entry.deprecated === 'boolean' ? entry.deprecated : undefined,
    };
  }

  private parseRawSchema(
    schema: JsonObject,
    componentId: AllowedComponentId,
  ): RawComponentSchema {
    const fields: RawComponentSchema = {};

    for (const [key, value] of Object.entries(schema)) {
      const field = this.requireObject(
        value,
        `schema field ${componentId}.${key}`,
      );
      this.requireString(field, 'name', `schema field ${componentId}.${key}`);
      fields[key] = field as unknown as RawSchemaField;
    }

    return fields;
  }

  private requireObject(value: unknown, context: string): JsonObject {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(`Expected ${context} to be a JSON object`);
    }

    return value as JsonObject;
  }

  private requireString(
    object: JsonObject,
    key: string,
    context: string,
  ): string {
    const value = object[key];

    if (typeof value !== 'string') {
      throw new Error(`Expected ${context}.${key} to be a string`);
    }

    return value;
  }

  private resolveDefinitionsDirectory(): string {
    const candidates = [
      process.env.DEFINITIONS_DIR,
      resolve(process.cwd(), 'definitions'),
      resolve(process.cwd(), '..', 'definitions'),
      resolve(__dirname, '..', '..', '..', 'definitions'),
    ].filter((candidate): candidate is string => Boolean(candidate));

    const directory = candidates.find((candidate) =>
      existsSync(resolve(candidate, 'challenge-library.json')),
    );

    if (!directory) {
      throw new Error(
        'Definitions directory not found. Set DEFINITIONS_DIR or place definitions/ beside backend/.',
      );
    }

    return directory;
  }

  private readJsonObject(filename: string): JsonObject {
    const filePath = resolve(this.definitionsDirectory, filename);

    if (!existsSync(filePath)) {
      throw new Error(
        `Required component definition file is missing: ${filePath}`,
      );
    }

    try {
      const parsed: unknown = JSON.parse(readFileSync(filePath, 'utf8'));

      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        throw new Error('expected a JSON object at the top level');
      }

      return parsed as JsonObject;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Unable to load ${filePath}: ${message}`);
    }
  }
}
