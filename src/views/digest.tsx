import type { DigestResult, DigestRow } from '../digest/types.js';

// A row needs a look when a job was retried 3+ times or its last run failed.
export function needsAttention(row: DigestRow): boolean {
  return row.retries >= 3 || row.lastStatus === 'fail';
}

export function DigestBoard({ digest }: { digest: DigestResult }) {
  return (
    <>
      <h1>digest · {digest.night}</h1>
      {digest.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first</th>
              <th>last</th>
            </tr>
          </thead>
          <tbody>
            {digest.rows.map((row) => (
              <tr class={needsAttention(row) ? 'warn' : undefined}>
                <td>{row.job}</td>
                <td>{row.owner ?? '—'}</td>
                <td>{row.runs}</td>
                <td>{row.retries}</td>
                <td>{row.lastStatus}</td>
                <td>{row.lastError ?? '—'}</td>
                <td>{row.firstAt}</td>
                <td>{row.lastAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {digest.badLines > 0 ? (
        <p class="mute">{digest.badLines} unreadable line(s) skipped</p>
      ) : null}
    </>
  );
}
