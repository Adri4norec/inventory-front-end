import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoanRefreshService {
  private readonly refresh$ = new Subject<void>();

  readonly onRefresh$ = this.refresh$.asObservable();

  notifyRefresh(): void {
    this.refresh$.next();
  }
}
