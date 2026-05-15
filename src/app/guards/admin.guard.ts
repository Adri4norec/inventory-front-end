import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';

/** Bloqueia COLABORADOR; exige perfil ADMIN. */
export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AuthService);

  if (typeof window === 'undefined') {
    return true;
  }

  const token = auth.getToken();
  if (!token) {
    return router.createUrlTree(['/login']);
  }

  auth.resolveUserRole();

  if (auth.isAdmin()) {
    return true;
  }

  if (auth.isColaborador()) {
    return router.createUrlTree(['/equipaments'], { queryParams: { accessDenied: '1' } });
  }

  return router.createUrlTree(['/login']);
};
