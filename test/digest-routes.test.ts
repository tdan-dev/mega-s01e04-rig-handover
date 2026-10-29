import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

// runs/ is read-only real data: fixtures for the edge cases live in a temp dir.
const base = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60 };
const realConfig = { ...base, runsDir: 'runs' };

const EMPTY = '2026-10-01';
const BAD = '2026-10-02';

const GOOD_LINE = JSON.stringify({ at: '2026-10-02T09:00:00+01:00', job: 'lane/sync', status: 'ok', owner: 'rook' });
const NOT_JSON = '{"at": "2026-10-02T10:00:00+01:00", "job": ';
const WRONG_SHAPE = JSON.stringify({ at: '2026-10-02T11:00:00+01:00', job: 'lane/sync', status: 'maybe' });

let tmpRuns: string;

beforeAll(() => {
  tmpRuns = mkdtempSync(join(tmpdir(), 'rig-digest-routes-'));
  writeFileSync(join(tmpRuns, `${EMPTY}.jsonl`), '');
  writeFileSync(join(tmpRuns, `${BAD}.jsonl`), [GOOD_LINE, NOT_JSON, WRONG_SHAPE].join('\n') + '\n');
});

afterAll(() => {
  rmSync(tmpRuns, { recursive: true, force: true });
});

const tmpConfig = () => ({ ...base, runsDir: tmpRuns });

describe('digest routes on the real runs/ fixtures', () => {
  it('GET /digest/:night answers 200 with the table for a valid night', async () => {
    const res = await createApp(realConfig).request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('digest · 2026-10-28');
    expect(html).toContain('lane/sync');
  });

  it('GET /api/digest/:night answers 200 for a valid night', async () => {
    const res = await createApp(realConfig).request('/api/digest/2026-10-28');
    expect(res.status).toBe(200);
  });

  it('GET /digest/:night answers 404 for a night with no file', async () => {
    const res = await createApp(realConfig).request('/digest/1999-01-01');
    expect(res.status).toBe(404);
    expect(await res.text()).toContain('no log for 1999-01-01');
  });
});

describe('digest routes on an empty night', () => {
  it('GET /digest/:night answers 200 and says nothing ran', async () => {
    const res = await createApp(tmpConfig()).request(`/digest/${EMPTY}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('nothing ran');
    expect(html).not.toContain('<table');
  });

  it('GET /api/digest/:night answers 200 with no rows and no bad lines', async () => {
    const res = await createApp(tmpConfig()).request(`/api/digest/${EMPTY}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ night: EMPTY, rows: [], badLines: 0 });
  });
});

describe('digest routes on a night with bad lines', () => {
  it('GET /digest/:night answers 200, shows the good row and counts the bad lines', async () => {
    const res = await createApp(tmpConfig()).request(`/digest/${BAD}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('lane/sync');
    expect(html).toContain('2 unreadable line(s) skipped');
  });

  it('GET /api/digest/:night answers 200 with the good row and badLines = 2', async () => {
    const res = await createApp(tmpConfig()).request(`/api/digest/${BAD}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.badLines).toBe(2);
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0].job).toBe('lane/sync');
  });
});
