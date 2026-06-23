import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';
import {
  ACCESS_MODULES,
  AppModuleKey,
  createDefaultPermissions,
  ModulePermissionLevel,
} from '../../settings/user-settings/access-profile.model';
import { toAccessProfile } from '../../settings/user-settings/access-profile.mapper';

const STORAGE_KEY = 'modulePermissions';
const STORAGE_PROFILE_KEY = 'modulePermissionsProfileId';

@Injectable({
  providedIn: 'root',
})
export class PermissionService {
  private readonly permissionsSubject = new BehaviorSubject<Record<string, ModulePermissionLevel>>(
    createDefaultPermissions('ocultar')
  );
  readonly permissions$ = this.permissionsSubject.asObservable();

  private loadRequest: Observable<void> | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private userService: UserService,
    private authService: AuthService
  ) {
    this.restoreFromStorage();
  }

  ensureLoaded(): Observable<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      return of(true);
    }

    if (!this.authService.getToken()) {
      return of(true);
    }

    const profileId = this.authService.getProfileId();
    if (!profileId) {
      this.applyFallbackPermissions();
      return of(true);
    }

    if (this.getCachedProfileId() === profileId && this.hasLoadedPermissions()) {
      return of(true);
    }

    if (!this.loadRequest) {
      this.loadRequest = this.fetchAndApply(profileId).pipe(
        tap({
          complete: () => {
            this.loadRequest = null;
          },
        }),
        catchError(() => {
          this.loadRequest = null;
          this.applyFallbackPermissions();
          return of(void 0);
        })
      );
    }

    return this.loadRequest.pipe(map(() => true));
  }

  reload(): Observable<void> {
    this.loadRequest = null;
    const profileId = this.authService.getProfileId();
    if (!profileId) {
      this.applyFallbackPermissions();
      return of(void 0);
    }
    return this.fetchAndApply(profileId);
  }

  clear(): void {
    this.permissionsSubject.next(createDefaultPermissions('ocultar'));
    this.loadRequest = null;
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_PROFILE_KEY);
  }

  getLevel(module: AppModuleKey): ModulePermissionLevel {
    return this.permissionsSubject.value[module] ?? 'ocultar';
  }

  canView(module: AppModuleKey): boolean {
    const level = this.getLevel(module);
    return level === 'visualizar' || level === 'editar';
  }

  canEdit(module: AppModuleKey): boolean {
    return this.getLevel(module) === 'editar';
  }

  isHidden(module: AppModuleKey): boolean {
    return this.getLevel(module) === 'ocultar';
  }

  canViewAny(modules: AppModuleKey[]): boolean {
    return modules.some((module) => this.canView(module));
  }

  private fetchAndApply(profileId: string): Observable<void> {
    return this.userService.getProfileById(profileId).pipe(
      tap((apiProfile) => {
        const profile = toAccessProfile(apiProfile);
        const permissions = profile.isAdmin
          ? createDefaultPermissions('editar')
          : profile.permissions;
        this.setPermissions(permissions, profileId);
      }),
      map(() => void 0)
    );
  }

  private applyFallbackPermissions(): void {
    if (this.authService.isAdmin()) {
      this.setPermissions(createDefaultPermissions('editar'));
      return;
    }
    this.setPermissions(createDefaultPermissions('ocultar'));
  }

  private setPermissions(
    permissions: Record<string, ModulePermissionLevel>,
    profileId?: string
  ): void {
    this.permissionsSubject.next({ ...permissions });
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(permissions));
    if (profileId) {
      localStorage.setItem(STORAGE_PROFILE_KEY, profileId);
    }
  }

  private restoreFromStorage(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Record<string, ModulePermissionLevel>;
      this.permissionsSubject.next(parsed);
    } catch {
      // ignora cache inválido
    }
  }

  private getCachedProfileId(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    return localStorage.getItem(STORAGE_PROFILE_KEY);
  }

  private hasLoadedPermissions(): boolean {
    const permissions = this.permissionsSubject.value;
    return ACCESS_MODULES.some((module) => permissions[module.key] !== 'ocultar');
  }
}
