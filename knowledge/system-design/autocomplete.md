# Search autocomplete

## Example question
Design search autocomplete with low-latency prefix suggestions.

## Scope and illustrative estimates
I would clarify language, personalization, freshness and unsafe-content filtering. Assume 20 million daily users typing 20 queried prefixes: about 4,630 prefix reads/s average. We can relax count freshness while keeping read latency low.

## Example architecture and data flow
An offline/streaming aggregation pipeline maintains normalized query counts and builds prefix-to-top-K suggestion snapshots. Read replicas serve versioned trie or indexed-prefix structures, with a cache for popular prefixes. The API returns a small ranked list for a locale and prefix. An atomic snapshot pointer switches readers to complete new versions.

## Deep dive, failure handling and tradeoffs
Normalize Unicode consistently and define what counts as a character. Bound top-K storage at each prefix and handle empty/long prefixes. Compare a compact trie with a key-value prefix index and batch rebuilds with incremental updates. Personalization can rerank a safe global candidate set without leaking private queries. Rate-limit abusive traffic and filter sensitive suggestions before publication. Track response p99, stale snapshot age, suggestion relevance and filter failures. Test a popular prefix hotspot, a failed index build and a rollback.

## Adaptation
This is an original illustrative practice answer, not a production claim. Recompute
scale and revisit consistency, security and failure decisions for the actual
question. Do not attribute this design or its numbers to the candidate.
