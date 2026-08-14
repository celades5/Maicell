import { FormControl, FormGroup, Validators } from '@angular/forms';
import {
  ComponentConfigField,
  ComponentDefinition,
} from '../../../core/models/component-definition.model';
import { ComponentInstance, Flow } from '../../../core/models/flow.model';

export type ConfigFormGroup = FormGroup<Record<string, FormControl<unknown>>>;

export interface ComponentInstanceForm {
  componentId: FormControl<string>;
  config: ConfigFormGroup;
}

export function definitionsByRole(
  definitions: ComponentDefinition[],
  role: ComponentDefinition['role'],
): ComponentDefinition[] {
  return definitions.filter((definition) => definition.role === role);
}

export function findDefinition(
  definitions: ComponentDefinition[],
  componentId: string,
): ComponentDefinition | undefined {
  return definitions.find((definition) => definition.id === componentId);
}

export function buildConfigGroup(
  fields: ComponentConfigField[],
  existing: Record<string, unknown> = {},
): ConfigFormGroup {
  const controls: Record<string, FormControl<unknown>> = {};

  for (const field of fields) {
    const raw =
      existing[field.key] !== undefined
        ? existing[field.key]
        : (field.defaultValue ?? defaultForField(field));

    controls[field.key] = new FormControl<unknown>(
      normalizeControlValue(field, raw),
      field.required ? { validators: [Validators.required] } : {},
    );
  }

  return new FormGroup(controls);
}

export function buildInstanceGroup(
  definition: ComponentDefinition | undefined,
  existing?: ComponentInstance,
): FormGroup<ComponentInstanceForm> {
  const componentId = existing?.componentId ?? definition?.id ?? '';
  const fields = definition?.configFields ?? [];

  return new FormGroup<ComponentInstanceForm>({
    componentId: new FormControl(componentId, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    config: buildConfigGroup(fields, existing?.config ?? {}),
  });
}

export function replaceInstanceConfig(
  group: FormGroup<ComponentInstanceForm>,
  definition: ComponentDefinition | undefined,
  keepValues = true,
): void {
  const previous = keepValues
    ? (group.controls.config.getRawValue() as Record<string, unknown>)
    : {};
  group.setControl(
    'config',
    buildConfigGroup(definition?.configFields ?? [], previous),
  );
}

export function flowToFormValue(flow: Flow): {
  name: string;
  consumer: ComponentInstance;
  services: ComponentInstance[];
  producer: ComponentInstance;
} {
  const steps = [...(flow.steps ?? [])].sort((a, b) => a.order - b.order);

  return {
    name: flow.name,
    consumer: {
      componentId: flow.consumerComponentId,
      config: flow.consumerConfig ?? {},
    },
    services: steps.map((step) => ({
      componentId: step.componentId,
      config: step.config ?? {},
    })),
    producer: {
      componentId: flow.producerComponentId,
      config: flow.producerConfig ?? {},
    },
  };
}

export function instanceGroupToPayload(
  group: FormGroup<ComponentInstanceForm>,
): ComponentInstance {
  return {
    componentId: group.controls.componentId.value,
    config: serializeConfig(group.controls.config.getRawValue()),
  };
}

function defaultForField(field: ComponentConfigField): unknown {
  if (field.fieldType === 'boolean') {
    return false;
  }

  return '';
}

function normalizeControlValue(
  field: ComponentConfigField,
  value: unknown,
): unknown {
  if (field.fieldType === 'boolean') {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return value.trim().toLowerCase() === 'true';
    }
    return false;
  }

  if (value === undefined || value === null) {
    return '';
  }

  return String(value);
}

function serializeConfig(
  values: Record<string, unknown>,
): Record<string, unknown> {
  const config: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (typeof value === 'string' && value.trim() === '') {
      continue;
    }
    config[key] = value;
  }

  return config;
}
