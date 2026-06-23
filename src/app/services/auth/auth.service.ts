import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { LoginRequest } from '../../models/auth/LoginRequest';
import { UserResponse } from '../../models/users/UserResponse';
import { UserService } from '../user/user.service';

/** Papel derivado do nome do perfil para guards e menu lateral. */
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

  getProfileId(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    const stored = localStorage.getItem('profileId')?.trim();
    return stored || null;
  }

  getProfileName(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    const stored = localStorage.getItem('profileName')?.trim();
    return stored || null;
  }

  /**
   * Papel derivado do perfil (Admin → ADMIN; demais perfis → COLABORADOR).
   */
  getUserRole(): UserRole | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    const stored = localStorage.getItem('userRole');
    if (stored === 'ADMIN' || stored === 'COLABORADOR') {
      return stored;
    }

    const fromToken = this.getRoleFromToken();
    if (fromToken) {
      return fromToken;
    }

    return this.deriveUserRoleFromProfileName(this.getProfileName());
  }

  resolveUserRole(): UserRole | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    const role =
      this.getRoleFromToken() ?? this.deriveUserRoleFromProfileName(this.getProfileName());

    if (role) {
      localStorage.setItem('userRole', role);
    } else {
      localStorage.removeItem('userRole');
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

  getLoggedUserId(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    const storedUserId = localStorage.getItem('userId')?.trim();
    if (storedUserId && this.isUuid(storedUserId)) {
      return storedUserId;
    }

    const token = this.getToken();
    if (!token) return null;

    const payload = this.decodeJwtPayload(token);
    if (!payload) return null;

    const candidates: string[] = [
      payload['managerId'],
      payload['manager_id'],
      payload['logged_user_id'],
      payload['loggedUserId'],
      payload['user_id'],
      payload['userId'],
      payload['id'],
      payload['sub']
    ]
      .map((v) => String(v ?? '').trim())
      .filter(Boolean);

    const uuid = candidates.find((v) => this.isUuid(v)) ?? null;
    if (uuid) {
      localStorage.setItem('userId', uuid);
    }
    return uuid;
  }

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

    const profileId = String(response.profileId ?? '').trim();
    if (profileId) {
      localStorage.setItem('profileId', profileId);
    } else {
      localStorage.removeItem('profileId');
    }

    if (response.profileName) {
      localStorage.setItem('profileName', response.profileName);
    } else {
      localStorage.removeItem('profileName');
    }

    const role =
      this.getRoleFromToken() ?? this.deriveUserRoleFromProfileName(response.profileName);

    if (role) {
      localStorage.setItem('userRole', role);
    } else {
      localStorage.removeItem('userRole');
    }

    this.updateUserRole();
  }

  private deriveUserRoleFromProfileName(profileName: string | null | undefined): UserRole | null {
    const name = profileName?.trim();
    if (!name) {
      return null;
    }

    if (name.toLowerCase() === 'admin') {
      return 'ADMIN';
    }

    return 'COLABORADOR';
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  private getRoleFromToken(): UserRole | null {
    const token = this.getToken();
    if (!token) return null;

    const payload = this.decodeJwtPayload(token);
    if (!payload) return null;

    const profileName = payload['profileName'] ?? payload['profile_name'];
    if (profileName) {
      const fromProfile = this.deriveUserRoleFromProfileName(String(profileName));
      if (fromProfile) {
        return fromProfile;
      }
    }

    const raw =
      payload['role'] ??
      payload['roles'] ??
      payload['authorities'] ??
      payload['authority'];

    const candidates: string[] = [];
    if (Array.isArray(raw)) {
      raw.forEach((v) => candidates.push(String(v)));
    } else if (typeof raw === 'string') {
      raw.split(/[,\s]+/).filter(Boolean).forEach((v) => candidates.push(v));
    } else if (raw != null) {
      candidates.push(String(raw));
    }

    for (const candidate of candidates) {
      const role = this.normalizeLegacyRole(candidate);
      if (role) return role;
    }

    return null;
  }

  /** Fallback para tokens legados que ainda carregam ROLE_ADMIN / ROLE_COLABORADOR. */
  private normalizeLegacyRole(value: unknown): UserRole | null {
    if (value == null) return null;
    const text = String(value).trim();
    if (!text) return null;

    const upper = text.replace(/^ROLE_/, '').toUpperCase();

    if (upper === 'ADMIN' || upper.includes('ADMIN')) {
      return 'ADMIN';
    }
    if (upper === 'COLABORADOR' || upper.includes('COLABOR')) {
      return 'COLABORADOR';
    }

    return null;
  }

  private decodeJwtPayload(token: string): Record<string, unknown> | null {
    const parts = token.split('.');
    if (parts.length < 2) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

    try {
      const json = decodeURIComponent(
        atob(padded)
          .split('')
          .map((c) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
          .join('')
      );
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  private updateUserRole(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const role = this.getUserRole();
    if (this.userRoleSubject.value !== role) {
      this.userRoleSubject.next(role);
    }
  }

  setUserRole(role: UserRole): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    localStorage.setItem('userRole', role);
    this.updateUserRole();
  }

  hasRole(role: UserRole): boolean {
    return this.getUserRole() === role;
  }

  hasAnyRole(roles: UserRole[]): boolean {
    const userRole = this.getUserRole();
    return userRole ? roles.includes(userRole) : false;
  }

  isAdmin(): boolean {
    return this.getProfileName()?.trim().toLowerCase() === 'admin';
  }

  isColaborador(): boolean {
    return !this.isAdmin() && !!this.getToken() && !!this.getProfileName();
  }

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
    localStorage.removeItem('profileId');
    localStorage.removeItem('profileName');

    this.updateUserRole();
  }
}
