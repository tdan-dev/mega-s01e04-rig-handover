import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/types.js';

describe('readNight', () => {
  it('reads runs/2026-10-28.jsonl into rows, sorted by job, counting the bad line', () => {
    const result = readNight('runs', '2026-10-28');
    expect(result).not.toBeNull();
    expect(result!.rows).toHaveLength(5);
    expect(result!.badLines).toBe(1);
    expect(result!.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('keeps a row for a null owner, and the last status/error/timestamp seen', () => {
    const result = readNight('runs', '2026-10-28')!;
    const digest = result.rows.find((r) => r.job === 'digest/render')!;
    expect(digest.owner).toBeNull();

    const fixtures = result.rows.find((r) => r.job === 'fixtures/refresh')!;
    expect(fixtures.runs).toBe(4);
    expect(fixtures.retries).toBe(3);
    expect(fixtures.lastStatus).toBe('ok');
    expect(fixtures.lastError).toBeNull();

    const backup = result.rows.find((r) => r.job === 'notes/backup')!;
    expect(backup.lastStatus).toBe('fail');
    expect(backup.lastError).toBe('quota exceeded');
  });

  it('returns null for a night with no file', () => {
    expect(readNight('runs', '1999-01-01')).toBeNull();
  });
});
