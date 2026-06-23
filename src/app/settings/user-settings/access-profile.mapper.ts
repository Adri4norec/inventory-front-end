import {
  ACCESS_MODULES,
  createDefaultPermissions,
  ModulePermissionLevel,
} from './access-profile.model';
import { AccessProfile } from './access-profile.model';
import {
  ProfileApiRequest,
  ProfileApiResponse,
  ProfilePermissionApi,
} from '../../models/users/profile-api.model';

const MODULE_TO_API: Record<string, ProfilePermissionApi['module']> = {
  inventory: 'INVENTARIO',
  loans: 'EMPRESTIMO',
  custody: 'CUSTODIA',
};

const MODULE_FROM_API: Record<ProfilePermissionApi['module'], string> = {
  INVENTARIO: 'inventory',
  EMPRESTIMO: 'loans',
  CUSTODIA: 'custody',
};

const LEVEL_TO_API = {
  ocultar: 'OCULTAR',
  visualizar: 'VISUALIZAR',
  editar: 'EDITAR',
} as const;

const LEVEL_FROM_API: Record<ProfilePermissionApi['accessLevel'], ModulePermissionLevel> = {
  OCULTAR: 'ocultar',
  VISUALIZAR: 'visualizar',
  EDITAR: 'editar',
};

export function toProfileApiRequest(
  name: string,
  permissions: Record<string, ModulePermissionLevel>
): ProfileApiRequest {
  return {
    name: name.trim(),
    permissions: ACCESS_MODULES.map((mod) => ({
      module: MODULE_TO_API[mod.key],
      accessLevel: LEVEL_TO_API[permissions[mod.key] ?? 'ocultar'],
    })),
  };
}

export function toAccessProfile(api: ProfileApiResponse, expanded = false): AccessProfile {
  const permissions =
    api.permissions?.length > 0
      ? permissionsFromApi(api.permissions)
      : createDefaultPermissions('ocultar');

  return {
    id: api.id,
    name: api.name,
    isAdmin: api.fixed,
    permissions,
    expanded,
  };
}

function permissionsFromApi(
  permissions: ProfilePermissionApi[]
): Record<string, ModulePermissionLevel> {
  const mapped = createDefaultPermissions('ocultar');

  for (const item of permissions) {
    const moduleKey = MODULE_FROM_API[item.module];
    if (moduleKey) {
      mapped[moduleKey] = LEVEL_FROM_API[item.accessLevel] ?? 'ocultar';
    }
  }

  return mapped;
}
