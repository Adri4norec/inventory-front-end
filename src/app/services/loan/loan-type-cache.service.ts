import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LoanType } from '../../models/loans/loans.model';

/**
 * Cache local do tipo de empréstimo por loanId.
 * Workaround enquanto GET /api/v1/loans/{id} não retorna loanType.
 */
@Injectable({ providedIn: 'root' })
export class LoanTypeCacheService {
  private readonly storageKey = 'inventory_loan_type_by_id';

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  remember(loanId: string, loanType: LoanType): void {
    if (!this.canUseStorage() || !loanId || !loanType) return;
    const map = this.readMap();
    map[loanId] = loanType;
    localStorage.setItem(this.storageKey, JSON.stringify(map));
  }

  get(loanId: string): LoanType | null {
    if (!this.canUseStorage() || !loanId) return null;
    return this.readMap()[loanId] ?? null;
  }

  private canUseStorage(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private readMap(): Record<string, LoanType> {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object') return {};
      return parsed as Record<string, LoanType>;
    } catch {
      return {};
    }
  }
}
