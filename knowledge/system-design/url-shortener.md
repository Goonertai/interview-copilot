# URL shortener

## Example question
Design a URL shortening service with custom aliases and expiring links.

## Scope and illustrative estimates
I would clarify whether custom aliases and click analytics are required. Assume 2 million new links and 100 million redirects per day: about 23 writes/s and 1,157 reads/s on average; a 10x peak is an assumption, not a measured workload.

## Example architecture and data flow
POST /links creates a mapping; GET /{code} resolves it. Store code as a unique primary key with destination, owner and expiry. Generate a random base62 code and retry only on a uniqueness conflict. Redirect handlers use cache-aside over durable storage. Expired or unknown codes return an explicit error; click events go asynchronously to analytics.

## Deep dive, failure handling and tradeoffs
The invariant is one live destination per code. A conditional insert prevents concurrent collisions. Cache TTL must respect expiry; removal needs invalidation or bounded staleness. Compare 301 caching with 302 control, and random codes with allocated IDs. A viral link creates a hot read key: replicate/cache reads rather than shard that single key blindly. Validate destination schemes and handle abuse. Track redirect p99, cache misses, collisions and stale redirects.

## Adaptation
This is an original illustrative practice answer, not a production claim. Recompute
scale and revisit consistency, security and failure decisions for the actual
question. Do not attribute this design or its numbers to the candidate.
