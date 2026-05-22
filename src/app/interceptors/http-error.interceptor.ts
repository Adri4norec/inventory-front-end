import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

const INSUFFICIENT_STOCK_MESSAGE = 'Estoque insuficiente para o acessório solicitado.';

function resolveFriendlyMessage(error: HttpErrorResponse): string | null {
  const body = error.error;
  const status = error.status;

  if (status === 409) {
    const code = typeof body === 'object' && body != null
      ? String((body as { message?: string; code?: string; type?: string }).message
        ?? (body as { code?: string }).code
        ?? (body as { type?: string }).type
        ?? '')
      : '';
    if (
      code === 'INSUFFICIENT_STOCK' ||
      String(body).includes('INSUFFICIENT_STOCK')
    ) {
      return INSUFFICIENT_STOCK_MESSAGE;
    }
    if (typeof body === 'object' && body != null && (body as { message?: string }).message) {
      return String((body as { message: string }).message);
    }
    return INSUFFICIENT_STOCK_MESSAGE;
  }

  if (status === 400) {
    const businessType =
      typeof body === 'object' && body != null
        ? String((body as { type?: string; error?: string }).type ?? (body as { error?: string }).error ?? '')
        : '';
    const message =
      typeof body === 'object' && body != null && (body as { message?: string }).message
        ? String((body as { message: string }).message)
        : null;
    if (businessType === 'BUSINESS_ERROR' && message) {
      return message;
    }
    if (message) {
      return message;
    }
  }

  return null;
}

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        const friendly = resolveFriendlyMessage(error);
        if (friendly) {
          snackBar.open(friendly, 'Fechar', {
            duration: 7000,
            panelClass: ['error-snackbar']
          });
        }
      }
      return throwError(() => error);
    })
  );
};
