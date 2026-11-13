# News feed / social timeline

## Example question
Design a social news feed for users following other users.

## Scope and illustrative estimates
I would clarify chronological versus ranked feeds and freshness requirements. Assume 20 million daily users opening a feed 10 times: roughly 2,315 feed reads/s average, with a separately specified peak. Posts and relationships are durable; feed ordering can be eventually consistent.

## Example architecture and data flow
Post creation writes the post and an outbox event atomically. Workers update follower inboxes containing post IDs; feed reads hydrate IDs through a post cache/store and use cursor pagination. Follow relationships support both follower enumeration and following lookups. The ranking service can be a later extension, not an unexplained dependency.

## Deep dive, failure handling and tradeoffs
Use fan-out on write for ordinary authors and merge-on-read for very large follower counts. This trades read latency for write amplification. Idempotent inbox inserts prevent duplicate feed entries after retries. Deletion/privacy changes must be enforced during hydration even if an inbox is stale. Bound inbox size and worker backlog; replay from durable events after a crash. Monitor freshness lag, hot-author fan-out, read p99 and access-filter errors. Changing to ranked feeds requires score/version-aware pagination and explicit freshness tradeoffs.

## Adaptation
This is an original illustrative practice answer, not a production claim. Recompute
scale and revisit consistency, security and failure decisions for the actual
question. Do not attribute this design or its numbers to the candidate.
