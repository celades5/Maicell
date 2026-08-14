/** One selected component + its config (create/update request body). */
export interface ComponentInstance {
  componentId: string;
  config?: Record<string, unknown>;
}

/** Request body for POST /api/flows and (partial) PATCH /api/flows/:id */
export interface CreateFlowRequest {
  name: string;
  consumer: ComponentInstance;
  services: ComponentInstance[];
  producer: ComponentInstance;
}

export type UpdateFlowRequest = Partial<CreateFlowRequest>;

/** Persisted service step returned with a flow. */
export interface FlowStep {
  id: string;
  flowId: string;
  componentId: string;
  order: number;
  config: Record<string, unknown>;
}

/** Shape returned by GET /api/flows and GET /api/flows/:id */
export interface Flow {
  id: string;
  name: string;
  consumerComponentId: string;
  consumerConfig: Record<string, unknown>;
  producerComponentId: string;
  producerConfig: Record<string, unknown>;
  steps: FlowStep[];
  createdAt: string;
  updatedAt: string;
}
