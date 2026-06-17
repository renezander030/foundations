# Note: caching layer in front of the search API

The fix that survived the traffic spike.

- A small in-memory TTL cache on the read path absorbed most of the load. We
  reached for a distributed cache first; we did not need it.
- Cache the query, not the rendered response. The render changed more often than
  the underlying results.
- 60s TTL was the sweet spot for our freshness requirement. Tune to yours.

Status: proven under last quarter's spike. Re-check the TTL against your SLA.
