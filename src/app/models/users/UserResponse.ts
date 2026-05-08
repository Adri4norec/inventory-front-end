export interface UserResponse {
  id: string;
  fullName: string;
  email: string;
  username: string;
  roleName: string; 
  /**
   * O backend novo retorna `access_token`.
   * Mantemos compatibilidade com o legado (`token`) caso ainda exista em algum ambiente.
   */
  access_token?: string;
  token?: string;
}