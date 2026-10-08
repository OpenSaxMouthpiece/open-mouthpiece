// `?fresh` (local dev server and the dev site only): forget everything this site keeps in the
// browser before the app reads it, so a test starts like a first visit. The flag is then dropped
// from the address, so a reload keeps the new session. Imported first by main.tsx.
const params = new URLSearchParams(location.search);
if (params.has("fresh") && (import.meta.env.DEV || location.hostname.startsWith("dev."))) {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    // storage blocked: nothing to forget
  }
  params.delete("fresh");
  const q = params.toString();
  history.replaceState(null, "", location.pathname + (q ? `?${q}` : "") + location.hash);
}
export {};
