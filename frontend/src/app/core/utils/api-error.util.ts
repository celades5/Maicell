import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorBody, FlowValidationIssue } from '../models/api-error.model';

export interface ApiFeedback {
  status: number | null;
  title: string;
  message: string;
  hint: string | null;
  issues: FlowValidationIssue[];
  isConflict: boolean;
  isNotFound: boolean;
  isValidation: boolean;
}

export function readApiErrorBody(error: unknown): ApiErrorBody | null {
  if (!(error instanceof HttpErrorResponse)) {
    return null;
  }

  const body = error.error;
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return null;
  }

  return body as ApiErrorBody;
}

/** Single human-readable summary for toasts / banners. */
export function formatApiErrorMessage(error: unknown): string {
  return parseApiFeedback(error).message;
}

export function getValidationIssues(error: unknown): FlowValidationIssue[] {
  return readApiErrorBody(error)?.details?.issues ?? [];
}

export function parseApiFeedback(error: unknown): ApiFeedback {
  const body = readApiErrorBody(error);
  const status =
    error instanceof HttpErrorResponse
      ? error.status
      : (body?.statusCode ?? null);

  const issues = body?.details?.issues ?? [];
  const hint =
    typeof body?.hint === 'string' && body.hint.trim() ? body.hint : null;

  let message = 'Unexpected error';
  if (body) {
    if (typeof body.message === 'string' && body.message.trim()) {
      message = body.message;
    } else if (Array.isArray(body.message) && body.message.length > 0) {
      message = body.message.join(' ');
    } else if (body.error) {
      message = body.error;
    }
  } else if (error instanceof HttpErrorResponse) {
    message = error.message || `Request failed (${error.status})`;
  } else if (error instanceof Error) {
    message = error.message;
  }

  const title =
    typeof body?.error === 'string' && body.error.trim()
      ? body.error
      : status === 409
        ? 'Duplicate Flow Name'
        : status === 404
          ? 'Not Found'
          : status === 400
            ? 'Validation Failed'
            : 'Request Failed';

  return {
    status,
    title,
    message,
    hint,
    issues,
    isConflict: status === 409,
    isNotFound: status === 404,
    isValidation: status === 400 && issues.length > 0,
  };
}
