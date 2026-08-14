/** Nested issue from FlowValidationService (HTTP 400). */
export interface FlowValidationIssue {
  path: string;
  message: string;
  code: string;
}

/**
 * Nest-style error JSON used by this API
 * (ConflictException, NotFoundException, BadRequestException, ValidationPipe).
 */
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
