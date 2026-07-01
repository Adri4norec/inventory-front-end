export type ModulePermissionLevel = 'ocultar' | 'visualizar' | 'editar';

export type AppModuleKey = 'inventory' | 'loans' | 'custody';

export interface AccessModule {
  key: string;
  label: string;
}

export interface AccessProfile {
  id: string;
  name: string;
  /** Perfil Admin do sistema — permissões somente leitura na UI de configuração. */
  isAdmin: boolean;
  /** Perfil fixo — não pode ser excluído (ex.: Admin, Gerente). */
  isFixed: boolean;
  permissions: Record<string, ModulePermissionLevel>;
  expanded: boolean;
}

export function isSystemAdminProfile(name: string): boolean {
  return name.trim().toLowerCase() === 'admin';
}

export function compareAccessProfiles(
  a: AccessProfile,
  b: AccessProfile,
  creationOrder: ReadonlyMap<string, number> = new Map()
): number {
  if (a.isFixed !== b.isFixed) {
    return a.isFixed ? -1 : 1;
  }

  if (a.isFixed && b.isFixed) {
    if (a.isAdmin !== b.isAdmin) {
      return a.isAdmin ? -1 : 1;
    }
    return a.name.localeCompare(b.name, 'pt-BR');
  }

  return (creationOrder.get(b.id) ?? 0) - (creationOrder.get(a.id) ?? 0);
}

export function sortAccessProfiles(
  profiles: AccessProfile[],
  creationOrder: ReadonlyMap<string, number> = new Map()
): AccessProfile[] {
  return [...profiles].sort((a, b) => compareAccessProfiles(a, b, creationOrder));
}

export function buildProfileCreationOrder(
  profiles: readonly Pick<AccessProfile, 'id'>[]
): Map<string, number> {
  return new Map(profiles.map((profile, index) => [profile.id, index]));
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
    isFixed: true,
    permissions: createDefaultPermissions('editar'),
    expanded: false
  };
}
