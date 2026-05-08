export type AuthType = 'LOCAL' | 'LDAP';

export interface LoginRequest {
  username: string;
  password: string;
  authType: AuthType;
}

