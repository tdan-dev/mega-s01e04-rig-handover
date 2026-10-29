import { readFileSync } from 'node:fs';

export type JobStatus = 'ok' | 'retry' | 'fail';

export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: JobStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

export type DigestResult = {
  night: string;
  rows: DigestRow[];
  badLines: number;
};

const STATUSES: JobStatus[] = ['ok', 'retry', 'fail'];

type RawEntry = {
  at: string;
  job: string;
  status: JobStatus;
  owner?: string | null;
  error?: string;
};

function isRawEntry(value: unknown): value is RawEntry {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.at === 'string' &&
    typeof v.job === 'string' &&
    typeof v.status === 'string' &&
    STATUSES.includes(v.status as JobStatus) &&
    (v.owner === undefined || v.owner === null || typeof v.owner === 'string') &&
    (v.error === undefined || typeof v.error === 'string')
  );
}

// Reads runs/<night>.jsonl into one row per job, newest line wins for owner/status/error.
// A line that doesn't parse (or doesn't match the shape) is counted, never thrown.
export function readNight(runsDir: string, night: string): DigestResult | null {
  let text: string;
  try {
    text = readFileSync(`${runsDir}/${night}.jsonl`, 'utf8');
  } catch {
    return null;
  }

  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  const order: string[] = [];
  const byJob = new Map<string, DigestRow>();
  let badLines = 0;

  for (const line of lines) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      badLines += 1;
      continue;
    }
    if (!isRawEntry(parsed)) {
      badLines += 1;
      continue;
    }

    const owner = parsed.owner ?? null;
    const existing = byJob.get(parsed.job);
    if (!existing) {
      order.push(parsed.job);
      byJob.set(parsed.job, {
        job: parsed.job,
        owner,
        runs: 1,
        retries: parsed.status === 'retry' ? 1 : 0,
        lastStatus: parsed.status,
        lastError: parsed.error ?? null,
        firstAt: parsed.at,
        lastAt: parsed.at,
      });
    } else {
      existing.runs += 1;
      if (parsed.status === 'retry') existing.retries += 1;
      existing.owner = owner;
      existing.lastStatus = parsed.status;
      existing.lastError = parsed.error ?? null;
      existing.lastAt = parsed.at;
    }
  }

  const rows = order.map((job) => byJob.get(job)!).sort((a, b) => a.job.localeCompare(b.job));

  return { night, rows, badLines };
}
