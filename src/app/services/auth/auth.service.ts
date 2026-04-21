import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, BehaviorSubject } from 'rxjs';

export type UserRole = 'ADMIN' | 'COLABORADOR';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userRoleSubject = new BehaviorSubject<UserRole | null>(this.getUserRole());
  public userRole$: Observable<UserRole | null> = this.userRoleSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.updateUserRole();
  }

  /**
   * Obtém o papel (role) do usuário armazenado no localStorage
   */
  getUserRole(): UserRole | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    const role = localStorage.getItem('userRole');
    return (role === 'ADMIN' || role === 'COLABORADOR') ? role : null;
  }

  /**
   * Atualiza o estado do papel do usuário
   */
  private updateUserRole(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const role = this.getUserRole();
    this.userRoleSubject.next(role);
  }

  /**
   * Armazena o papel do usuário no localStorage e atualiza o estado
   */
  setUserRole(role: UserRole): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    localStorage.setItem('userRole', role);
    this.updateUserRole();
  }

  /**
   * Verifica se o usuário tem o papel especificado
   */
  hasRole(role: UserRole): boolean {
    return this.getUserRole() === role;
  }

  /**
   * Verifica se o usuário tem algum dos papéis especificados
   */
  hasAnyRole(roles: UserRole[]): boolean {
    const userRole = this.getUserRole();
    return userRole ? roles.includes(userRole) : false;
  }

  /**
   * Verifica se o usuário é administrador
   */
  isAdmin(): boolean {
    return this.hasRole('ADMIN');
  }

  /**
   * Verifica se o usuário é colaborador
   */
  isColaborador(): boolean {
    return this.hasRole('COLABORADOR');
  }

  /**
   * Limpa o papel do usuário (logout)
   */
  clearUserRole(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    localStorage.removeItem('userRole');
    this.updateUserRole();
  }
}
