import type { Status } from '../status.js';

const dash = (n: number | null) => (n === null ? '—' : String(n));

export function StatusBoard({ status }: { status: Status }) {
  return (
    <>
      <h1>status</h1>
      <table>
        <tbody>
          <tr><th>adapter</th><td>{status.adapter}</td></tr>
          <tr><th>installed</th><td>{status.installed}</td></tr>
          <tr>
            <th>last beat</th>
            <td>{status.lastBeat ? `${status.lastBeat.at} · pid ${status.lastBeat.pid}` : <span class="warn">none</span>}</td>
          </tr>
        </tbody>
      </table>
      <h2>nights on disk</h2>
      {status.nightsWithCounts.length === 0 ? (
        <p class="mute">nothing in runs/</p>
      ) : (
        <ul>
          {status.nightsWithCounts.map((n) => (
            <li>
              <a href={`/digest/${n.night}`}>{n.night}</a>{' '}
              <span class="mute">
                ok {dash(n.ok)} · retry {dash(n.retry)} · fail {dash(n.fail)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
