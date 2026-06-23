export type AuthType = 'LOCAL' | 'LDAP';

export interface UserRequest {
  fullName?: string;
  email?: string;
  username?: string;
  password?: string;
  profileId?: string;
  authType?: AuthType;
}
