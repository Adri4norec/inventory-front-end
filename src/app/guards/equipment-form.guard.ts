import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';

/**
 * Cadastro/edição de equipamento por ID:
 * - ADMIN: livre
 * - COLABORADOR: apenas mode=view (redireciona se necessário)
 */
export const equipmentFormGuard: CanActivateFn = (route) => {
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
    const id = route.paramMap.get('id');
    if (!id) {
      return router.createUrlTree(['/equipaments'], { queryParams: { accessDenied: '1' } });
    }

    if (route.queryParamMap.get('mode') === 'view') {
      return true;
    }

    const queryParams: Record<string, string> = { mode: 'view' };
    const showPhotos = route.queryParamMap.get('showPhotos');
    if (showPhotos) {
      queryParams['showPhotos'] = showPhotos;
    }

    return router.createUrlTree(['/cadastro', id], { queryParams });
  }

  return router.createUrlTree(['/equipaments'], { queryParams: { accessDenied: '1' } });
};
