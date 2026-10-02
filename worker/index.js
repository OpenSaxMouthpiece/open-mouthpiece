// The site's Worker: the static app from dist/ (served by the assets binding before this runs),
// plus one endpoint, POST /api/log, where the app sends error reports (src/report.ts). Each report
// becomes one JSON line in Workers Logs (dashboard: Workers & Pages -> open-mouthpiece -> Logs).
// Only known fields are kept, trimmed; no IP address is logged.
const FIELDS = { kind: 60, message: 500, design: 80, build: 20, ua: 200, openscad: 300 };

function clean(data) {
  const out = {};
  for (const [k, max] of Object.entries(FIELDS)) if (typeof data[k] === 'string') out[k] = data[k].slice(0, max);
  if (Array.isArray(data.changed))
    out.changed = data.changed.filter((n) => typeof n === 'string' && /^\w{1,40}$/.test(n)).slice(0, 40);
  return out;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.endsWith('/api/log')) {
      if (request.method !== 'POST') return new Response('POST only', { status: 405 });
      let data;
      try {
        data = JSON.parse((await request.text()).slice(0, 4000));
      } catch {
        return new Response(null, { status: 400 });
      }
      if (!data || typeof data !== 'object') return new Response(null, { status: 400 });
      console.error(JSON.stringify({ report: 'app-error', ...clean(data), country: request.cf?.country ?? null }));
      return new Response(null, { status: 204 });
    }
    return env.ASSETS.fetch(request);
  },
};
