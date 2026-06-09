import { LOCALE_ID, Provider } from '@angular/core';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { BR_DATE_FORMATS } from './br-date-formats';
import { BrazilianDateAdapter } from './brazilian-date-adapter';

/** Providers de data no padrão brasileiro (dd/MM/yyyy). */
export function provideBrazilianDate(): Provider[] {
  return [
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    { provide: MAT_DATE_LOCALE, useValue: 'pt-BR' },
    { provide: MAT_DATE_FORMATS, useValue: BR_DATE_FORMATS },
    { provide: DateAdapter, useClass: BrazilianDateAdapter },
  ];
}
