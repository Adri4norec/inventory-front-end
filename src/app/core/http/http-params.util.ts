import { HttpParams } from '@angular/common/http';

export function appendAll(
  params: HttpParams,
  key: string,
  values?: readonly string[] | null,
): HttpParams {
  if (!values?.length) {
    return params;
  }

  return values.reduce((current, value) => {
    const trimmed = value?.trim();
    return trimmed ? current.append(key, trimmed) : current;
  }, params);
}

export function toIsoDate(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().split('T')[0];
}
