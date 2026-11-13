# Distributed cache

## Example question
Design a distributed in-memory key-value cache.

## Scope and illustrative estimates
I would clarify whether this is disposable cache data or an authoritative store, expected item sizes and failure semantics. Assume 100 million keys averaging 1 KB: about 100 GB of values before metadata and replicas. Treat durability as out of scope unless explicitly required.

## Example architecture and data flow
Clients use a versioned consistent-hash ring with virtual nodes to locate owners. Nodes support GET, SET and DELETE with TTL and bounded memory. A control plane publishes membership and health changes. Replicas improve availability, but reads after failover may be stale; the backing store remains the source of truth for cache-aside workloads.

## Deep dive, failure handling and tradeoffs
Define TTL expiration and eviction behavior precisely. Concurrent fills can cause a stampede: use bounded single-flight, TTL jitter and safe stale reads where allowed. A hot key cannot be fixed by hashing alone; replicate reads or add a local cache. Compare consistent hashing with proxy-based routing and asynchronous with synchronous replication. Protect against oversized values and untrusted clients. Monitor hit ratio, eviction, memory pressure, tail latency and origin load. Test node loss and rebalancing without overwhelming the backing database.

## Adaptation
This is an original illustrative practice answer, not a production claim. Recompute
scale and revisit consistency, security and failure decisions for the actual
question. Do not attribute this design or its numbers to the candidate.
