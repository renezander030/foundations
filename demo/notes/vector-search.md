# Note: vector search, the version that actually shipped

What worked in production, not the tutorial version.

- Keep the embedding model and the index in the same process at first. The
  network hop to a separate vector service was the slowest part, not the search.
- 768-dim embeddings were enough for our product catalog. 1536 did not measurably
  improve recall and doubled storage.
- Re-embed on a nightly cron, not on every write. Writes spiked latency.
- The "best practice" of a managed vector DB was overkill until ~1M vectors.

Status: proven on the product-search workload. Verify dims/recall for yours.
