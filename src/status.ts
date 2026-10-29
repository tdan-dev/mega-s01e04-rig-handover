import { readdirSync } from 'node:fs';
import type { RigConfig } from './config.js';
import { lastBeat, type Beat } from './heartbeat.js';
import { readNight } from './digest/types.js';

export type NightCounts = {
  night: string;
  // null when the night's run log can't be read: rendered as a dash, never dropped.
  ok: number | null;
  retry: number | null;
  fail: number | null;
};

export type Status = {
  adapter: string;
  installed: string;
  lastBeat: Beat | null;
  nights: string[];
  nightsWithCounts: NightCounts[];
};

// Nights on disk = runs/<YYYY-MM-DD>.jsonl, newest first.
export function nightsOnDisk(runsDir: string): string[] {
  try {
    return readdirSync(runsDir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f))
      .map((f) => f.slice(0, 10))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

// Counts per night, by each job's last status (see readNight).
function countsFor(runsDir: string, night: string): NightCounts {
  const digest = readNight(runsDir, night);
  if (!digest) return { night, ok: null, retry: null, fail: null };
  const count = (s: 'ok' | 'retry' | 'fail') =>
    digest.rows.filter((r) => r.lastStatus === s).length;
  return { night, ok: count('ok'), retry: count('retry'), fail: count('fail') };
}

export function readStatus(config: RigConfig): Status {
  const nights = nightsOnDisk(config.runsDir);
  return {
    adapter: config.adapter,
    installed: config.installed,
    lastBeat: lastBeat(),
    nights,
    nightsWithCounts: nights.map((n) => countsFor(config.runsDir, n)),
  };
}
