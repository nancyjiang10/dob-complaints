// The server load in +page.server.js performs data fetching and prerender entries.
// Keep the universal load as a pass-through to avoid duplicate API work during build.
export function load({ data }) {
  return data;
}
