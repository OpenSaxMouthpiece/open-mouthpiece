// The site's Worker: the static app from dist/ (served by the assets binding before this runs),
// plus two endpoints where the app sends anonymous reports (opt-out in the ⚙ menu):
// - POST /api/log: error reports (src/report.ts). One JSON line each in Workers Logs (dashboard:
//   Workers & Pages -> open-mouthpiece -> Logs), and a row in the usage database.
// - POST /api/usage: usage events in batches (src/usage.ts), rows in the USAGE database (D1,
//   table `events`, worker/usage.sql); `node scripts/usage.mjs` reads them.
// Only known fields are kept, trimmed; no IP address is stored. Without the USAGE binding the
// events are dropped (and errors still reach the log).
const FIELDS = { kind: 60, message: 500, design: 80, build: 20, ua: 200, openscad: 300 };
const MAX_BODY = 32000;
const MAX_EVENTS = 40; // per request (the app sends at most 40 at a time)

function clean(data) {
  const out = {};
  for (const [k, max] of Object.entries(FIELDS)) if (typeof data[k] === 'string') out[k] = data[k].slice(0, max);
  if (Array.isArray(data.changed))
    out.changed = data.changed.filter((n) => typeof n === 'string' && /^\w{1,40}$/.test(n)).slice(0, 40);
  return out;
}

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : null);

async function readJson(request) {
  try {
    const data = JSON.parse((await request.text()).slice(0, MAX_BODY));
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

const INSERT =
  'INSERT INTO events (ts, t, visit, kind, name, design, data, country, device, build) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

async function saveEvents(env, rows) {
  if (!env.USAGE || !rows.length) return;
  const stmt = env.USAGE.prepare(INSERT);
  await env.USAGE.batch(rows.map((r) => stmt.bind(...r)));
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const country = request.cf?.country ?? null;
    if (url.pathname.endsWith('/api/log') || url.pathname.endsWith('/api/usage')) {
      if (request.method !== 'POST') return new Response('POST only', { status: 405 });
      const data = await readJson(request);
      if (!data) return new Response(null, { status: 400 });
      const now = Date.now();
      let rows;
      if (url.pathname.endsWith('/api/log')) {
        const c = clean(data);
        console.error(JSON.stringify({ report: 'app-error', ...c, country }));
        const { kind, message, design, build, ...rest } = c;
        rows = [
          [
            now,
            null,
            null,
            'error',
            str(kind, 60),
            design ?? null,
            JSON.stringify({ message, ...rest }),
            country,
            null,
            build ?? null,
          ],
        ];
      } else {
        const visit = str(data.visit, 12);
        const device = data.device === 'phone' ? 'phone' : 'desktop';
        const build = str(data.build, 20);
        const events = Array.isArray(data.events) ? data.events.slice(0, MAX_EVENTS) : [];
        rows = events
          .filter((e) => e && typeof e.kind === 'string' && /^[a-z_]{1,30}$/.test(e.kind))
          .map((e) => {
            const t = Number(e.t); // ms into the visit: orders a visit's events
            const d = e.data && typeof e.data === 'object' ? JSON.stringify(e.data).slice(0, 8000) : null;
            return [
              now,
              Number.isFinite(t) ? Math.round(t) : null,
              visit,
              e.kind,
              str(e.name, 80),
              str(e.design, 80),
              d,
              country,
              device,
              build,
            ];
          });
      }
      ctx.waitUntil(
        saveEvents(env, rows).catch((err) => console.error(JSON.stringify({ report: 'usage-db', error: String(err) }))),
      );
      return new Response(null, { status: 204 });
    }
    return env.ASSETS.fetch(request);
  },
};
