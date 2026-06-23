import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from '../services/auth/auth.service';
import { PermissionService } from '../services/auth/permission.service';

export const equipmentFormGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const permissions = inject(PermissionService);

  if (typeof window === 'undefined') {
    return true;
  }

  const token = auth.getToken();
  if (!token) {
    return router.createUrlTree(['/login']);
  }

  return permissions.ensureLoaded().pipe(
    map(() => {
      if (permissions.canEdit('inventory')) {
        return true;
      }

      if (permissions.canView('inventory')) {
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
    })
  );
};
