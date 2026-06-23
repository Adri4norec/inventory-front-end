import { HttpErrorResponse } from '@angular/common/http';

export interface ApiErrorDetails {
  code?: string;
  message?: string;
  violations?: unknown;
}

export function normalizeApiErrorDetails(err: unknown): ApiErrorDetails {
  const payload = extractApiErrorPayload(err);
  const error = payload ?? {};

  return {
    code: readApiErrorCode(error),
    message: readApiErrorMessage(error),
    violations: readApiErrorViolations(error),
  };
}

export function extractApiErrorMessage(err: unknown, fallback = 'Erro no servidor'): string {
  const payload = extractApiErrorPayload(err);
  if (!payload) {
    return fallback;
  }
  return readApiErrorMessage(payload, fallback);
}

export function extractApiErrorCode(err: unknown): string | undefined {
  const payload = extractApiErrorPayload(err);
  return payload ? readApiErrorCode(payload) : undefined;
}

export function extractApiErrorViolations(err: unknown): unknown {
  const payload = extractApiErrorPayload(err);
  return payload ? readApiErrorViolations(payload) : undefined;
}

export function formatApiViolations(violations: unknown): string | null {
  if (!violations) {
    return null;
  }

  if (Array.isArray(violations)) {
    return violations
      .map((violation) => {
        if (!violation || typeof violation !== 'object') {
          return String(violation ?? '').trim();
        }

        const record = violation as Record<string, unknown>;
        const field = typeof record['field'] === 'string'
          ? record['field']
          : typeof record['property'] === 'string'
            ? record['property']
            : '';
        const message = typeof record['message'] === 'string'
          ? record['message']
          : typeof record['defaultMessage'] === 'string'
            ? record['defaultMessage']
            : '';
        return field && message ? `${field}: ${message}` : message || String(record).trim();
      })
      .filter(Boolean)
      .join(' • ');
  }

  if (typeof violations === 'object') {
    return Object.entries(violations as Record<string, unknown>)
      .map(([field, value]) => {
        const messages = Array.isArray(value) ? value : [value];
        const text = messages
          .map((entry) => String(entry ?? '').trim())
          .filter(Boolean)
          .join('; ');
        return text ? `${field}: ${text}` : field;
      })
      .join(' • ');
  }

  return String(violations).trim();
}

function extractApiErrorPayload(err: unknown): Record<string, unknown> | null {
  if (!err || typeof err !== 'object') {
    return null;
  }

  const record = err as Record<string, unknown>;
  const body = record['error'];

  if (body && typeof body === 'object' && body !== null) {
    return body as Record<string, unknown>;
  }

  if (body && typeof body === 'string') {
    return { message: body };
  }

  if (record['message'] && typeof record['message'] === 'string') {
    return { message: record['message'] };
  }

  if (err instanceof HttpErrorResponse) {
    return { message: err.message };
  }

  return null;
}

function readApiErrorCode(error: Record<string, unknown>): string | undefined {
  const code = error['code'] ?? (error['error'] as { code?: string } | undefined)?.code;
  return typeof code === 'string' && code.trim() ? code : undefined;
}

function readApiErrorMessage(error: Record<string, unknown>, fallback = 'Erro no servidor'): string {
  const message = error['message'] ?? (error['error'] as { message?: string } | undefined)?.message;
  return typeof message === 'string' && message.trim() ? message : fallback;
}

function readApiErrorViolations(error: Record<string, unknown>): unknown {
  return error['violations'] ?? (error['error'] as { violations?: unknown } | undefined)?.violations;
}
