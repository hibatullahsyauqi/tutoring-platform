import { describe, expect, test } from 'bun:test';
import { hrefWith, MAX_PAGE_SIZE, paginate, parsePage } from './pagination';

describe('parsePage', () => {
  test.each([
    [undefined, 1],
    ['', 1],
    ['abc', 1],
    ['0', 1],
    ['-3', 1],
    ['2.5', 1],
    ['3', 3],
    ['999999999', 1],
  ])('%p -> %p', (input, expected) => {
    expect(parsePage(input)).toBe(expected);
  });

  test('takes the first of repeated params', () => {
    expect(parsePage(['4', '9'])).toBe(4);
  });
});

describe('paginate', () => {
  test('first page of many', () => {
    expect(paginate(1, 25, 10)).toEqual({ page: 1, pageSize: 10, pageCount: 3, total: 25, skip: 0, take: 10 });
  });

  test('last page has the remainder window', () => {
    const w = paginate(3, 25, 10);
    expect(w.skip).toBe(20);
    expect(w.page).toBe(3);
  });

  test('a page past the end is pulled back to the last page', () => {
    expect(paginate(50, 25, 10).page).toBe(3);
  });

  test('empty list is one empty page', () => {
    expect(paginate(1, 0, 10)).toEqual({ page: 1, pageSize: 10, pageCount: 1, total: 0, skip: 0, take: 10 });
  });

  test('page size is capped and never below one', () => {
    expect(paginate(1, 1000, 10_000).pageSize).toBe(MAX_PAGE_SIZE);
    expect(paginate(1, 10, 0).pageSize).toBe(1);
  });

  test('never produces a negative skip', () => {
    expect(paginate(-5, 10, 10).skip).toBe(0);
  });
});

describe('hrefWith', () => {
  test('keeps other params and sets one', () => {
    expect(hrefWith('/library', { type: 'PAST_PAPER', q: 'x' }, { page: '2' })).toBe('/library?type=PAST_PAPER&q=x&page=2');
  });

  test('clears a param and drops the query string when empty', () => {
    expect(hrefWith('/library', { page: '3' }, { page: undefined })).toBe('/library');
  });
});
