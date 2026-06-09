import { Injectable } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';

/** Exibe e interpreta datas no padrão brasileiro (dd/MM/yyyy). */
@Injectable()
export class BrazilianDateAdapter extends NativeDateAdapter {
  override parse(value: unknown): Date | null {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      const brMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
      if (brMatch) {
        const day = Number(brMatch[1]);
        const month = Number(brMatch[2]) - 1;
        const year = Number(brMatch[3]);
        const date = new Date(year, month, day);
        return this.isValid(date) ? date : null;
      }
    }
    return super.parse(value);
  }

  override format(date: Date, displayFormat: Object): string {
    if (!this.isValid(date)) {
      return '';
    }

    const token = String(displayFormat ?? '');
    const isMonthLabel =
      token === 'MMM yyyy' ||
      token === 'MMMM yyyy' ||
      token === 'monthYearLabel' ||
      token === 'monthYearA11yLabel';

    if (!isMonthLabel) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }

    return super.format(date, displayFormat);
  }
}
