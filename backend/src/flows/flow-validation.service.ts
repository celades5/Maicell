import { BadRequestException, Injectable } from '@nestjs/common';
import { ComponentDefinitionsService } from '../component-definitions/component-definitions.service';
import type {
  ComponentConfigField,
  ComponentDefinition,
} from '../component-definitions/component-definitions.models';
import type { ComponentRole } from '../component-definitions/component-definitions.constants';
import {
  ComponentInstanceDto,
  CreateFlowDto,
} from './dto/create-flow.dto';
import { UpdateFlowDto } from './dto/update-flow.dto';

export interface FlowValidationIssue {
  path: string;
  message: string;
  code: string;
}

@Injectable()
export class FlowValidationService {
  constructor(
    private readonly componentDefinitions: ComponentDefinitionsService,
  ) {}

  validateCreate(dto: CreateFlowDto): void {
    const issues: FlowValidationIssue[] = [];

    if (!dto.consumer) {
      issues.push({
        path: 'consumer',
        message: 'A flow must include exactly one consumer.',
        code: 'MISSING_CONSUMER',
      });
    } else {
      this.validateInstance(dto.consumer, 'consumer', 'consumer', issues);
    }

    if (!Array.isArray(dto.services)) {
      issues.push({
        path: 'services',
        message: 'Services must be an array (use [] when there are none).',
        code: 'INVALID_SERVICES',
      });
    } else {
      dto.services.forEach((service, index) => {
        this.validateInstance(service, `services[${index}]`, 'service', issues);
      });
    }

    if (!dto.producer) {
      issues.push({
        path: 'producer',
        message: 'A flow must include exactly one producer.',
        code: 'MISSING_PRODUCER',
      });
    } else {
      this.validateInstance(dto.producer, 'producer', 'producer', issues);
    }

    this.throwIfIssues(issues);
  }

  validateUpdate(dto: UpdateFlowDto): void {
    const issues: FlowValidationIssue[] = [];

    if (dto.consumer !== undefined) {
      this.validateInstance(dto.consumer, 'consumer', 'consumer', issues);
    }

    if (dto.services !== undefined) {
      if (!Array.isArray(dto.services)) {
        issues.push({
          path: 'services',
          message: 'Services must be an array (use [] when there are none).',
          code: 'INVALID_SERVICES',
        });
      } else {
        dto.services.forEach((service, index) => {
          this.validateInstance(
            service,
            `services[${index}]`,
            'service',
            issues,
          );
        });
      }
    }

    if (dto.producer !== undefined) {
      this.validateInstance(dto.producer, 'producer', 'producer', issues);
    }

    this.throwIfIssues(issues);
  }

  private validateInstance(
    instance: ComponentInstanceDto,
    path: string,
    expectedRole: ComponentRole,
    issues: FlowValidationIssue[],
  ): void {
    const componentId = instance?.componentId;

    if (typeof componentId !== 'string' || componentId.trim() === '') {
      issues.push({
        path: `${path}.componentId`,
        message: 'componentId is required.',
        code: 'MISSING_COMPONENT_ID',
      });
      return;
    }

    const definition = this.componentDefinitions.getById(componentId);

    if (!definition) {
      issues.push({
        path: `${path}.componentId`,
        message: `"${componentId}" is not an allowed component for this challenge.`,
        code: 'UNKNOWN_COMPONENT',
      });
      return;
    }

    if (definition.role !== expectedRole) {
      issues.push({
        path: `${path}.componentId`,
        message: `"${componentId}" is a ${definition.role}, but ${path} requires a ${expectedRole}.`,
        code: 'ROLE_MISMATCH',
      });
      return;
    }

    this.validateConfig(instance.config ?? {}, definition, path, issues);
  }

  private validateConfig(
    config: Record<string, unknown>,
    definition: ComponentDefinition,
    path: string,
    issues: FlowValidationIssue[],
  ): void {
    for (const field of definition.configFields) {
      const value = config[field.key];
      const fieldPath = `${path}.config.${field.key}`;

      if (this.isMissing(value)) {
        if (field.required) {
          issues.push({
            path: fieldPath,
            message: `"${field.label || field.key}" is required for ${definition.name}.`,
            code: 'REQUIRED_CONFIG',
          });
        }
        continue;
      }

      this.validateFieldValue(value, field, fieldPath, issues);
    }

    this.applyDomainRules(config, definition, path, issues);
  }

  private validateFieldValue(
    value: unknown,
    field: ComponentConfigField,
    fieldPath: string,
    issues: FlowValidationIssue[],
  ): void {
    switch (field.fieldType) {
      case 'boolean': {
        if (!this.isBooleanLike(value)) {
          issues.push({
            path: fieldPath,
            message: `"${field.label || field.key}" must be a boolean.`,
            code: 'INVALID_BOOLEAN',
          });
        }
        break;
      }
      case 'enumeration':
      case 'textenumeration': {
        const stringValue = this.asNonEmptyString(value);
        if (stringValue === null) {
          issues.push({
            path: fieldPath,
            message: `"${field.label || field.key}" must be a string.`,
            code: 'INVALID_ENUM',
          });
          break;
        }

        const allowed = field.options?.map((option) => option.value) ?? [];
        if (allowed.length > 0 && !allowed.includes(stringValue)) {
          issues.push({
            path: fieldPath,
            message: `"${field.label || field.key}" must be one of: ${allowed.join(', ')}.`,
            code: 'INVALID_ENUM',
          });
        }
        break;
      }
      case 'cron':
      case 'string':
      case 'description':
      default: {
        if (typeof value !== 'string') {
          issues.push({
            path: fieldPath,
            message: `"${field.label || field.key}" must be a string.`,
            code: 'INVALID_STRING',
          });
        } else if (field.required && value.trim() === '') {
          issues.push({
            path: fieldPath,
            message: `"${field.label || field.key}" cannot be empty.`,
            code: 'REQUIRED_CONFIG',
          });
        }
        break;
      }
    }
  }

  private applyDomainRules(
    config: Record<string, unknown>,
    definition: ComponentDefinition,
    path: string,
    issues: FlowValidationIssue[],
  ): void {
    if (definition.id === 'myesb-filereader-service') {
      const fileUri = config['file-uri'];
      if (typeof fileUri === 'string' && fileUri.trim() !== '') {
        const normalized = fileUri.trim();
        if (!/^file:/i.test(normalized)) {
          issues.push({
            path: `${path}.config.file-uri`,
            message:
              'file-uri must start with "file:" (for example file:/data/input.xml).',
            code: 'INVALID_FILE_URI',
          });
        }
      }
    }

    if (definition.id === 'myesb-file-producer') {
      const directory = config['directory'];
      if (typeof directory === 'string' && directory.trim() !== '') {
        const normalized = directory.trim();
        if (!/^file:/i.test(normalized)) {
          issues.push({
            path: `${path}.config.directory`,
            message:
              'directory must start with "file:" (for example file:/tmp/out).',
            code: 'INVALID_DIRECTORY_URI',
          });
        }
      }
    }
  }

  private isMissing(value: unknown): boolean {
    return value === undefined || value === null;
  }

  private isBooleanLike(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return true;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized === 'true' || normalized === 'false';
    }

    return false;
  }

  private asNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    return value;
  }

  private throwIfIssues(issues: FlowValidationIssue[]): void {
    if (issues.length === 0) {
      return;
    }

    throw new BadRequestException({
      message: 'The flow configuration is invalid.',
      error: 'Flow Validation Failed',
      details: { issues },
      hint: 'Fix the listed component and config problems, then try saving again.',
    });
  }
}
