import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { forkJoin } from 'rxjs';
import { ComponentDefinition } from '../../../core/models/component-definition.model';
import { CreateFlowRequest } from '../../../core/models/flow.model';
import { ComponentDefinitionsApiService } from '../../../core/services/component-definitions-api.service';
import { FlowsApiService } from '../../../core/services/flows-api.service';
import { parseApiFeedback } from '../../../core/utils/api-error.util';
import type { ApiFeedback } from '../../../core/utils/api-error.util';
import { ComponentConfigFieldsComponent } from '../components/component-config-fields.component';
import {
  ComponentInstanceForm,
  buildInstanceGroup,
  definitionsByRole,
  findDefinition,
  flowToFormValue,
  instanceGroupToPayload,
  replaceInstanceConfig,
} from '../utils/flow-form.util';

interface FlowFormControls {
  name: FormControl<string>;
  consumer: FormGroup<ComponentInstanceForm>;
  services: FormArray<FormGroup<ComponentInstanceForm>>;
  producer: FormGroup<ComponentInstanceForm>;
}

@Component({
  selector: 'app-flow-form-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    ComponentConfigFieldsComponent,
    ButtonModule,
  ],
  templateUrl: './flow-form.page.html',
  styleUrl: './flow-form.page.css',
})
export class FlowFormPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly definitionsApi = inject(ComponentDefinitionsApiService);
  private readonly flowsApi = inject(FlowsApiService);
  private readonly messages = inject(MessageService);

  readonly flowId = signal<string | null>(null);
  readonly isEdit = computed(() => this.flowId() !== null);

  readonly definitions = signal<ComponentDefinition[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly loadFailed = signal(false);
  readonly feedback = signal<ApiFeedback | null>(null);

  readonly consumers = computed(() =>
    definitionsByRole(this.definitions(), 'consumer'),
  );
  readonly services = computed(() =>
    definitionsByRole(this.definitions(), 'service'),
  );
  readonly producers = computed(() =>
    definitionsByRole(this.definitions(), 'producer'),
  );

  form: FormGroup<FlowFormControls> | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.flowId.set(id);

    if (id) {
      forkJoin({
        definitions: this.definitionsApi.getAll(),
        flow: this.flowsApi.getById(id),
      }).subscribe({
        next: ({ definitions, flow }) => {
          this.definitions.set(definitions);
          const value = flowToFormValue(flow);
          this.form = this.createForm(definitions, value);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.feedback.set(parseApiFeedback(err));
          this.loadFailed.set(true);
          this.loading.set(false);
        },
      });
      return;
    }

    this.definitionsApi.getAll().subscribe({
      next: (definitions) => {
        this.definitions.set(definitions);
        this.form = this.createForm(definitions);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.feedback.set(parseApiFeedback(err));
        this.loadFailed.set(true);
        this.loading.set(false);
      },
    });
  }

  get serviceGroups(): FormArray<FormGroup<ComponentInstanceForm>> {
    return this.form!.controls.services;
  }

  definitionFor(componentId: string): ComponentDefinition | undefined {
    return findDefinition(this.definitions(), componentId);
  }

  clearFeedback(): void {
    this.feedback.set(null);
  }

  goToFlows(): void {
    void this.router.navigate(['/flows']);
  }

  onConsumerChange(): void {
    if (!this.form) {
      return;
    }
    const componentId = this.form.controls.consumer.controls.componentId.value;
    replaceInstanceConfig(
      this.form.controls.consumer,
      this.definitionFor(componentId),
      false,
    );
  }

  onProducerChange(): void {
    if (!this.form) {
      return;
    }
    const componentId = this.form.controls.producer.controls.componentId.value;
    replaceInstanceConfig(
      this.form.controls.producer,
      this.definitionFor(componentId),
      false,
    );
  }

  onServiceChange(index: number): void {
    const group = this.serviceGroups.at(index);
    const componentId = group.controls.componentId.value;
    replaceInstanceConfig(group, this.definitionFor(componentId), false);
  }

  addService(): void {
    const first = this.services()[0];
    this.serviceGroups.push(
      buildInstanceGroup(first, first ? { componentId: first.id } : undefined),
    );
  }

  removeService(index: number): void {
    this.serviceGroups.removeAt(index);
  }

  moveService(index: number, offset: -1 | 1): void {
    const target = index + offset;
    if (target < 0 || target >= this.serviceGroups.length) {
      return;
    }
    const group = this.serviceGroups.at(index);
    this.serviceGroups.removeAt(index);
    this.serviceGroups.insert(target, group);
  }

  submit(): void {
    if (!this.form) {
      return;
    }

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      const incomplete = this.collectIncompleteFields(this.form);
      const fieldList = incomplete.join(', ');
      const detail = incomplete.length
        ? `Still needed: ${fieldList}.`
        : 'Please fill in the required fields before saving.';

      this.feedback.set({
        status: null,
        title: 'Form Incomplete',
        message: detail,
        hint: 'Required fields are marked with *.',
        issues: incomplete.map((label) => ({
          path: label,
          message: 'This field is required.',
          code: 'REQUIRED',
        })),
        isConflict: false,
        isNotFound: false,
        isValidation: true,
      });
      this.messages.add({
        severity: 'error',
        summary: 'Form Incomplete',
        detail,
        life: 7000,
      });
      this.scrollToFeedback();
      return;
    }

    const payload = this.toPayload(this.form);
    this.saving.set(true);
    this.feedback.set(null);

    const request$ = this.isEdit()
      ? this.flowsApi.update(this.flowId()!, payload)
      : this.flowsApi.create(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        void this.router.navigate(['/flows'], {
          queryParams: { saved: this.isEdit() ? 'updated' : 'created' },
        });
      },
      error: (err: unknown) => {
        this.saving.set(false);
        const feedback = parseApiFeedback(err);
        this.feedback.set(feedback);
        this.showFeedbackToast(feedback);
        this.scrollToFeedback();
      },
    });
  }

  private showFeedbackToast(feedback: ApiFeedback): void {
    const issueSummary =
      feedback.issues.length > 0
        ? feedback.issues
            .map((issue) => `${issue.path}: ${issue.message}`)
            .join(' ')
        : null;

    this.messages.add({
      severity: feedback.isConflict ? 'warn' : 'error',
      summary: feedback.title,
      detail: issueSummary ?? feedback.message,
      life: 8000,
    });
  }

  private scrollToFeedback(): void {
    queueMicrotask(() => {
      document
        .querySelector('.banner.error')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  /** Human-readable labels for invalid required controls. */
  private collectIncompleteFields(
    form: FormGroup<FlowFormControls>,
  ): string[] {
    const missing: string[] = [];

    if (form.controls.name.invalid) {
      missing.push('Flow name');
    }

    this.collectInstanceIncomplete('Consumer', form.controls.consumer, missing);

    form.controls.services.controls.forEach((group, index) => {
      this.collectInstanceIncomplete(`Service ${index + 1}`, group, missing);
    });

    this.collectInstanceIncomplete('Producer', form.controls.producer, missing);

    return missing;
  }

  private collectInstanceIncomplete(
    prefix: string,
    group: FormGroup<ComponentInstanceForm>,
    missing: string[],
  ): void {
    if (group.controls.componentId.invalid) {
      missing.push(`${prefix} component`);
    }

    const definition = this.definitionFor(group.controls.componentId.value);
    for (const [key, control] of Object.entries(group.controls.config.controls)) {
      if (!control.invalid) {
        continue;
      }
      const field = definition?.configFields.find((item) => item.key === key);
      missing.push(`${prefix}: ${field?.label || key}`);
    }
  }

  private createForm(
    definitions: ComponentDefinition[],
    existing?: ReturnType<typeof flowToFormValue>,
  ): FormGroup<FlowFormControls> {
    const consumerDef =
      findDefinition(definitions, existing?.consumer.componentId ?? '') ??
      definitionsByRole(definitions, 'consumer')[0];
    const producerDef =
      findDefinition(definitions, existing?.producer.componentId ?? '') ??
      definitionsByRole(definitions, 'producer')[0];

    const serviceDefs = definitionsByRole(definitions, 'service');
    const serviceGroups =
      existing?.services.map((service) =>
        buildInstanceGroup(
          findDefinition(definitions, service.componentId) ?? serviceDefs[0],
          service,
        ),
      ) ?? [];

    return new FormGroup<FlowFormControls>({
      name: new FormControl(existing?.name ?? '', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      consumer: buildInstanceGroup(consumerDef, existing?.consumer),
      services: new FormArray(serviceGroups),
      producer: buildInstanceGroup(producerDef, existing?.producer),
    });
  }

  private toPayload(form: FormGroup<FlowFormControls>): CreateFlowRequest {
    return {
      name: form.controls.name.value.trim(),
      consumer: instanceGroupToPayload(form.controls.consumer),
      services: form.controls.services.controls.map((group) =>
        instanceGroupToPayload(group),
      ),
      producer: instanceGroupToPayload(form.controls.producer),
    };
  }
}
