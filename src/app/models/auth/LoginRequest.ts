import { AuthType } from '../users/UserRequest';

export type { AuthType };

export interface LoginRequest {
  username: string;
  password: string;
  authType?: AuthType;
}
