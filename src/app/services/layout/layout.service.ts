import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LayoutService {
  /** Largura do menu lateral em px (shell flex — mesmo valor no CSS). */
  readonly sidebarWidthPx = 260;

  private readonly _menuOpen$ = new BehaviorSubject<boolean>(true);
  readonly menuOpen$ = this._menuOpen$.asObservable();

  get isMenuOpen(): boolean {
    return this._menuOpen$.value;
  }

  toggleMenu(): void {
    this._menuOpen$.next(!this._menuOpen$.value);
  }

  setMenuOpen(open: boolean): void {
    this._menuOpen$.next(open);
  }
}

