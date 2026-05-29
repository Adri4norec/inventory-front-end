import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { LoginRequest } from '../../models/auth/LoginRequest';
import { UserResponse } from '../../models/users/UserResponse';
import { UserService } from '../user/user.service';

export type UserRole = 'ADMIN' | 'COLABORADOR';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userRoleSubject = new BehaviorSubject<UserRole | null>(this.getUserRole());
  public userRole$: Observable<UserRole | null> = this.userRoleSubject.asObservable();

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private userService: UserService
  ) {
    this.updateUserRole();
  }

  login(credentials: LoginRequest): Observable<UserResponse> {
    return this.userService.login(credentials).pipe(
      tap((response) => this.persistSession(response))
    );
  }

  /**
   * Obtém o papel (role) do usuário armazenado no localStorage
   */
  getUserRole(): UserRole | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    const stored = localStorage.getItem('userRole');
    if (stored === 'ADMIN' || stored === 'COLABORADOR') return stored;

    const fromToken = this.getRoleFromToken();
    if (fromToken) return fromToken;

    return this.normalizeRole(localStorage.getItem('roleName'));
  }

  /**
   * Recalcula o perfil a partir do JWT e do roleName persistido no login.
   */
  resolveUserRole(): UserRole | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    const role = this.getRoleFromToken() ?? this.normalizeRole(localStorage.getItem('roleName'));
    if (role) {
      localStorage.setItem('userRole', role);
    }
    this.updateUserRole();
    return role;
  }

  getToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    return localStorage.getItem('access_token') || localStorage.getItem('token');
  }

  getFullName(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    const name = localStorage.getItem('fullName');
    return name && name.trim() ? name : null;
  }

  /**
   * Força recalcular role a partir do JWT e persistir em `userRole`.
   * Útil logo após o login.
   */
  syncUserRoleFromToken(): UserRole | null {
    return this.resolveUserRole();
  }

  private persistSession(response: UserResponse): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const token = response.access_token || response.token;
    if (token) {
      localStorage.setItem('access_token', token);
      localStorage.setItem('token', token);
    }

    localStorage.setItem('user', response.username);
    const id = String(response.id ?? '').trim();
    if (this.isUuid(id)) {
      localStorage.setItem('userId', id);
    } else {
      localStorage.removeItem('userId');
    }
    if (response.fullName) {
      localStorage.setItem('fullName', response.fullName);
    } else {
      localStorage.removeItem('fullName');
    }

    if (response.roleName) {
      localStorage.setItem('roleName', response.roleName);
    } else {
      localStorage.removeItem('roleName');
    }

    const role = this.getRoleFromToken() ?? this.normalizeRole(response.roleName);
    if (role) {
      localStorage.setItem('userRole', role);
    } else {
      localStorage.removeItem('userRole');
    }
    this.updateUserRole();
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  private normalizeRole(value: unknown): UserRole | null {
    if (value == null) return null;
    const text = String(value).trim();
    if (!text) return null;

    const upper = text.replace(/^ROLE_/, '').toUpperCase();

    if (upper === 'ADMIN' || upper === 'ADMINISTRADOR' || upper === 'ADMINISTRATOR') {
      return 'ADMIN';
    }
    if (upper === 'COLABORADOR' || upper === 'COLLABORATOR') {
      return 'COLABORADOR';
    }
    if (upper.includes('ADMIN')) return 'ADMIN';
    if (upper.includes('COLABOR')) return 'COLABORADOR';

    return null;
  }

  private getRoleFromToken(): UserRole | null {
    const token = this.getToken();
    if (!token) return null;

    const payload = this.decodeJwtPayload(token);
    if (!payload) return null;

    const raw =
      payload.role ??
      payload.roleName ??
      payload.roles ??
      payload.authorities ??
      payload.authority ??
      payload.perfis ??
      payload.perfil;

    const candidates: string[] = [];
    if (Array.isArray(raw)) {
      raw.forEach(v => candidates.push(String(v)));
    } else if (typeof raw === 'string') {
      // pode vir como "ADMIN" ou "ROLE_ADMIN" ou "ADMIN,COLABORADOR"
      raw.split(/[,\s]+/).filter(Boolean).forEach(v => candidates.push(v));
    } else if (raw != null) {
      candidates.push(String(raw));
    }

    for (const candidate of candidates) {
      const role = this.normalizeRole(candidate);
      if (role) return role;
    }
    return null;
  }

  private decodeJwtPayload(token: string): any | null {
    const parts = token.split('.');
    if (parts.length < 2) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

    try {
      const json = decodeURIComponent(
        atob(padded)
          .split('')
          .map(c => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
          .join('')
      );
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  /**
   * Atualiza o estado do papel do usuário
   */
  private updateUserRole(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const role = this.getUserRole();
    if (this.userRoleSubject.value !== role) {
      this.userRoleSubject.next(role);
    }
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

  logout(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    localStorage.removeItem('access_token');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    localStorage.removeItem('fullName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('roleName');

    this.updateUserRole();
  }
}
