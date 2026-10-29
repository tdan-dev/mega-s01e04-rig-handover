import { Hono } from 'hono';
import { loadConfig, type RigConfig } from './config.js';
import { lane } from './lane.js';
import { readNight } from './digest/types.js';
import { readStatus } from './status.js';
import { DigestBoard } from './views/digest.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/api/digest/:night', (c) => {
    const night = c.req.param('night');
    const result = /^\d{4}-\d{2}-\d{2}$/.test(night) ? readNight(config.runsDir, night) : null;
    if (result === null) return c.json({ error: 'not found' }, 404);
    return c.json(result);
  });

  app.get('/', (c) =>
    c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={readStatus(config)} />
      </Layout>,
    ),
  );

  app.get('/digest/:night', (c) => {
    const night = c.req.param('night');
    // The night becomes a file name, so only a plain date is accepted.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) {
      return c.html(
        <Layout title="digest" lane={lane()}>
          <p class="warn">not a night: {night}</p>
        </Layout>,
        404,
      );
    }
    const digest = readNight(config.runsDir, night);
    if (digest === null) {
      return c.html(
        <Layout title="digest" lane={lane()}>
          <p class="warn">no log for {night}</p>
        </Layout>,
        404,
      );
    }
    return c.html(
      <Layout title={`digest ${night}`} lane={lane()}>
        <DigestBoard digest={digest} />
      </Layout>,
    );
  });

  return app;
}
