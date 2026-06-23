import { HttpErrorResponse } from '@angular/common/http';

export interface MovementApiErrorBody {
  error?: string;
  message?: string;
}

/**
 * Safely extracts the message returned by the Spring Boot backend or falls back to a default status message.
 */
export function resolveMovementErrorMessage(err: unknown): string {
  if (!(err instanceof HttpErrorResponse)) {
    return 'Erro ao registrar movimentação.';
  }

  const body = err.error as MovementApiErrorBody | string | null;

  // Extract message if backend sent an error body object
  if (body && typeof body === 'object' && body.message) {
    return String(body.message).trim();
  }

  // Fallback messages based on generic HTTP status codes
  if (err.status === 400 || err.status === 409) {
    return 'Não foi possível registrar a movimentação. Verifique os dados e tente novamente.';
  }

  return 'Erro ao registrar movimentação.';
}
