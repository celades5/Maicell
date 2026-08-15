import { DatePipe } from '@angular/common';
import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { forkJoin } from 'rxjs';
import { Flow } from '../../../core/models/flow.model';
import { ComponentDefinitionsApiService } from '../../../core/services/component-definitions-api.service';
import { FlowsApiService } from '../../../core/services/flows-api.service';
import { formatApiErrorMessage } from '../../../core/utils/api-error.util';

type SortKey =
  | 'name'
  | 'consumer'
  | 'producer'
  | 'services'
  | 'createdAt'
  | 'updatedAt';

type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-flow-list-page',
  imports: [RouterLink, DatePipe, ButtonModule, TooltipModule],
  templateUrl: './flow-list.page.html',
  styleUrl: './flow-list.page.css',
})
export class FlowListPage implements OnInit {
  private readonly flowsApi = inject(FlowsApiService);
  private readonly definitionsApi = inject(ComponentDefinitionsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);

  readonly flows = signal<Flow[]>([]);
  readonly labelById = signal<Record<string, string>>({});
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);

  /** Client-side name filter (does not call the API). */
  readonly nameQuery = signal('');
  readonly sortKey = signal<SortKey>('name');
  readonly sortDir = signal<SortDir>('asc');

  readonly displayedFlows = computed(() => {
    const query = this.nameQuery().trim().toLowerCase();
    let list = this.flows();

    if (query) {
      list = list.filter((flow) => flow.name.toLowerCase().includes(query));
    }

    const key = this.sortKey();
    const direction = this.sortDir() === 'asc' ? 1 : -1;

    return [...list].sort(
      (left, right) => this.compareFlows(left, right, key) * direction,
    );
  });

  ngOnInit(): void {
    const saved = this.route.snapshot.queryParamMap.get('saved');
    if (saved === 'created') {
      this.messages.add({
        severity: 'success',
        summary: 'Saved',
        detail: 'Flow created successfully.',
        life: 4000,
      });
    } else if (saved === 'updated') {
      this.messages.add({
        severity: 'success',
        summary: 'Saved',
        detail: 'Flow updated successfully.',
        life: 4000,
      });
    } else if (saved === 'duplicated') {
      this.messages.add({
        severity: 'success',
        summary: 'Saved',
        detail: 'Flow duplicated successfully.',
        life: 4000,
      });
    }

    if (saved) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true,
      });
    }

    this.loadFlows();
  }

  goToNewFlow(): void {
    void this.router.navigate(['/flows/new']);
  }

  editFlow(id: string): void {
    void this.router.navigate(['/flows', id]);
  }

  viewFlow(id: string): void {
    void this.router.navigate(['/flows', id, 'view']);
  }

  duplicateFlow(id: string): void {
    void this.router.navigate(['/flows', id, 'duplicate']);
  }

  onNameQueryInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.nameQuery.set(value);
  }

  clearNameQuery(): void {
    this.nameQuery.set('');
  }

  toggleSort(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDir.update((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }

    this.sortKey.set(key);
    this.sortDir.set('asc');
  }

  sortIndicator(key: SortKey): string {
    if (this.sortKey() !== key) {
      return '';
    }
    return this.sortDir() === 'asc' ? ' ↑' : ' ↓';
  }

  loadFlows(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      flows: this.flowsApi.getAll(),
      definitions: this.definitionsApi.getAll(),
    }).subscribe({
      next: ({ flows, definitions }) => {
        const labels: Record<string, string> = {};
        for (const definition of definitions) {
          labels[definition.id] = definition.name;
        }
        this.labelById.set(labels);
        this.flows.set(flows);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        const detail = formatApiErrorMessage(err);
        this.error.set(detail);
        this.messages.add({
          severity: 'error',
          summary: 'Could not load flows',
          detail,
          life: 6000,
        });
        this.loading.set(false);
      },
    });
  }

  componentLabel(componentId: string): string {
    return this.labelById()[componentId] ?? componentId;
  }

  serviceCount(flow: Flow): number {
    return flow.steps?.length ?? 0;
  }

  pipelineSummary(flow: Flow): string {
    const steps = [...(flow.steps ?? [])].sort((a, b) => a.order - b.order);
    if (steps.length === 0) {
      return '—';
    }

    return steps
      .map((step) => this.componentLabel(step.componentId))
      .join(' → ');
  }

  /** Compact config lines for the list (ids, paths, cron). */
  configSummary(flow: Flow): string[] {
    const lines: string[] = [];

    const consumerBits = this.pickConfigBits(flow.consumerConfig, [
      'id',
      'cron-expression',
    ]);
    if (consumerBits.length) {
      lines.push(`Consumer: ${consumerBits.join(' · ')}`);
    }

    const steps = [...(flow.steps ?? [])].sort((a, b) => a.order - b.order);
    for (const step of steps) {
      const bits = this.pickConfigBits(step.config, [
        'id',
        'file-uri',
        'return-type',
      ]);
      const label = this.componentLabel(step.componentId);
      lines.push(bits.length ? `${label}: ${bits.join(' · ')}` : label);
    }

    const producerBits = this.pickConfigBits(flow.producerConfig, [
      'id',
      'directory',
    ]);
    if (producerBits.length) {
      lines.push(`Producer: ${producerBits.join(' · ')}`);
    }

    return lines.length > 0 ? lines : ['—'];
  }

  private compareFlows(left: Flow, right: Flow, key: SortKey): number {
    switch (key) {
      case 'name':
        return left.name.localeCompare(right.name, undefined, {
          sensitivity: 'base',
        });
      case 'consumer':
        return this.componentLabel(left.consumerComponentId).localeCompare(
          this.componentLabel(right.consumerComponentId),
          undefined,
          { sensitivity: 'base' },
        );
      case 'producer':
        return this.componentLabel(left.producerComponentId).localeCompare(
          this.componentLabel(right.producerComponentId),
          undefined,
          { sensitivity: 'base' },
        );
      case 'services':
        return this.serviceCount(left) - this.serviceCount(right);
      case 'createdAt':
        return (
          new Date(left.createdAt).getTime() -
          new Date(right.createdAt).getTime()
        );
      case 'updatedAt':
        return (
          new Date(left.updatedAt).getTime() -
          new Date(right.updatedAt).getTime()
        );
      default:
        return 0;
    }
  }

  private pickConfigBits(
    config: Record<string, unknown> | undefined,
    keys: string[],
  ): string[] {
    if (!config) {
      return [];
    }

    const bits: string[] = [];
    for (const key of keys) {
      const value = config[key];
      if (typeof value === 'string' && value.trim() !== '') {
        bits.push(`${key}=${value.trim()}`);
      } else if (typeof value === 'boolean') {
        bits.push(`${key}=${value}`);
      }
    }
    return bits;
  }

  deleteFlow(flow: Flow): void {
    const confirmed = window.confirm(
      `Delete flow "${flow.name}"? This cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    this.deletingId.set(flow.id);
    this.error.set(null);

    this.flowsApi.delete(flow.id).subscribe({
      next: () => {
        this.flows.update((current) =>
          current.filter((item) => item.id !== flow.id),
        );
        this.deletingId.set(null);
        this.messages.add({
          severity: 'success',
          summary: 'Deleted',
          detail: `Deleted "${flow.name}".`,
          life: 4000,
        });
      },
      error: (err: unknown) => {
        const detail = formatApiErrorMessage(err);
        this.error.set(detail);
        this.messages.add({
          severity: 'error',
          summary: 'Delete failed',
          detail,
          life: 6000,
        });
        this.deletingId.set(null);
      },
    });
  }
}
