export type ModulePermissionLevel = 'ocultar' | 'visualizar' | 'editar';

export type AppModuleKey = 'inventory' | 'loans' | 'custody';

export interface AccessModule {
  key: string;
  label: string;
}

export interface AccessProfile {
  id: string;
  name: string;
  isAdmin: boolean;
  permissions: Record<string, ModulePermissionLevel>;
  expanded: boolean;
}

export const ACCESS_MODULES: AccessModule[] = [
  { key: 'inventory', label: 'Inventário' },
  { key: 'loans', label: 'Empréstimo' },
  { key: 'custody', label: 'Custódia' }
];

export const PERMISSION_OPTIONS: { value: ModulePermissionLevel; label: string }[] = [
  { value: 'ocultar', label: 'Ocultar' },
  { value: 'visualizar', label: 'Visualizar' },
  { value: 'editar', label: 'Editar' }
];

export function createDefaultPermissions(level: ModulePermissionLevel = 'ocultar'): Record<string, ModulePermissionLevel> {
  return ACCESS_MODULES.reduce<Record<string, ModulePermissionLevel>>((acc, mod) => {
    acc[mod.key] = level;
    return acc;
  }, {});
}

export function createAdminProfile(): AccessProfile {
  return {
    id: 'admin',
    name: 'Admin',
    isAdmin: true,
    permissions: createDefaultPermissions('editar'),
    expanded: true
  };
}
