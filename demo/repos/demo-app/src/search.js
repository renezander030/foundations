// demo-app/src/search.js — illustrative only (a `repos` source hit, not proven).
// Shows a vector search behind a small cache. Present in the tree != runs for you.

const cache = new Map(); // tiny TTL cache; see notes/caching.md for the prod version

export function search(query, { index, ttlMs = 60_000 } = {}) {
  const key = query.trim().toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.results;

  // vector search over the local embeddings index (see notes/vector-search.md)
  const results = index.nearest(embed(query), 10);
  cache.set(key, { results, at: Date.now() });
  return results;
}

function embed(text) {
  // placeholder; the real model lives in the index service
  return text;
}
