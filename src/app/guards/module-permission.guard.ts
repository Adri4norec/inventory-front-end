import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from '../services/auth/auth.service';
import { PermissionService } from '../services/auth/permission.service';
import { AppModuleKey } from '../settings/user-settings/access-profile.model';

export const modulePermissionGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const permissions = inject(PermissionService);

  if (typeof window === 'undefined') {
    return true;
  }

  if (!auth.getToken()) {
    return router.createUrlTree(['/login']);
  }

  const module = route.data['module'] as AppModuleKey | undefined;
  const modules = (route.data['modules'] as AppModuleKey[] | undefined)
    ?? (module ? [module] : []);
  const minLevel = (route.data['minLevel'] as 'visualizar' | 'editar' | undefined) ?? 'visualizar';

  if (modules.length === 0) {
    return true;
  }

  return permissions.ensureLoaded().pipe(
    map(() => {
      const allowed = minLevel === 'editar'
        ? modules.some((item) => permissions.canEdit(item))
        : modules.some((item) => permissions.canView(item));

      if (allowed) {
        return true;
      }

      return router.createUrlTree(['/inventario'], { queryParams: { accessDenied: '1' } });
    })
  );
};
