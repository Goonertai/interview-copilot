# Distributed rate limiter

## Example question
Design an API rate limiter across many gateway instances.

## Scope and illustrative estimates
I would clarify the identity key, burst allowance, exactness and failure policy. Assume 100,000 checks/s and a small latency budget. Limit by authenticated tenant/user and endpoint; IP-only rules can penalize shared networks.

## Example architecture and data flow
Gateway nodes consult a rule cache and an atomic token-bucket operation partitioned by tenant/rule key. Store available tokens and last refill time; refill and consumption happen atomically using a server-side operation. Return allowed, remaining and retry-after metadata, mapping a denial to HTTP 429.

## Deep dive, failure handling and tradeoffs
The invariant is that refill plus consumption cannot exceed the configured allowance within the chosen model. A shared store simplifies coordination but adds latency and hot-tenant contention. Locally leased quotas reduce remote checks at the cost of bounded overshoot. Compare token bucket with sliding windows. Choose fail-open or fail-closed per endpoint risk; payment protection may differ from public browsing. Bound retries and monitor decision latency, rejects, store errors and measured overshoot. A global strict quota across regions requires explicit coordination and a partition policy.

## Adaptation
This is an original illustrative practice answer, not a production claim. Recompute
scale and revisit consistency, security and failure decisions for the actual
question. Do not attribute this design or its numbers to the candidate.
