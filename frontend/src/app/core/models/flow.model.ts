export interface ComponentInstance {
  componentId: string;
  config?: Record<string, unknown>;
}
export interface CreateFlowRequest {
  name: string;
  consumer: ComponentInstance;
  services: ComponentInstance[];
  producer: ComponentInstance;
}

export type UpdateFlowRequest = Partial<CreateFlowRequest>;

export interface FlowStep {
  id: string;
  flowId: string;
  componentId: string;
  order: number;
  config: Record<string, unknown>;
}
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
