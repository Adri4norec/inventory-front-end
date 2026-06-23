import { PageResponse } from '../../models/equipaments/equipament.model';

export function normalizePageResponse<T>(
  res: PageResponse<T> | T[] | Record<string, unknown>,
  page: number,
  size: number,
): PageResponse<T> {
  if (Array.isArray(res)) {
    const totalElements = res.length;
    const start = page * size;
    const content = res.slice(start, start + size);
    return { content, totalElements, number: page, size };
  }

  const record = res as PageResponse<T> & { content?: T[] };
  const content = record.content ?? [];
  const totalElements = typeof record.totalElements === 'number' ? record.totalElements : content.length;
  const number = typeof record.number === 'number' ? record.number : page;
  const pageSize = typeof record.size === 'number' ? record.size : size;

  return { content, totalElements, number, size: pageSize };
}
