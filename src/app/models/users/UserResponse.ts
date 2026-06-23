export interface UserResponse {
  id: string;
  fullName: string;
  email: string;
  username: string;
  profileId: string | null;
  profileName: string | null;
  token?: string;
  /** Compatibilidade com ambientes que ainda retornam access_token. */
  access_token?: string;
}
