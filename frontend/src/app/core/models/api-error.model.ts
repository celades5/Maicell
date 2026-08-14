export interface FlowValidationIssue {
  path: string;
  message: string;
  code: string;
}
export interface ApiErrorBody {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  details?: {
    issues?: FlowValidationIssue[];
    field?: string;
    value?: unknown;
    flowId?: string;
  };
  hint?: string;
}
