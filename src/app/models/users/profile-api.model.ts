export interface ProfilePermissionApi {
  module: 'INVENTARIO' | 'EMPRESTIMO' | 'CUSTODIA';
  accessLevel: 'OCULTAR' | 'VISUALIZAR' | 'EDITAR';
}

export interface ProfileApiRequest {
  name: string;
  permissions: ProfilePermissionApi[];
}

export interface ProfileApiResponse {
  id: string;
  name: string;
  fixed: boolean;
  permissions: ProfilePermissionApi[];
}

export interface ProfileApiError {
  error?: string;
  reasonCode?: 'FIXED_PROFILE' | 'PROFILE_IN_USE';
  message?: string;
  profileId?: string;
}
