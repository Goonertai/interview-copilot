# Transaction event ingestion

## Example question
Design near-real-time transaction ingestion with duplicate and out-of-order events.

## Scope and illustrative estimates
I would clarify source ordering guarantees, event identity, pending/posted semantics and freshness targets. Assume 5,000 events/s at 1 KB: about 432 GB/day before replication. State the ordering scope explicitly, such as one account, rather than promising global order.

## Example architecture and data flow
An authenticated producer writes to a durable partitioned log. Consumers validate schema and idempotently update transaction state with a stable source event ID and monotonic version or well-defined lifecycle rule. Commit offsets only after durable effects. Query models serve APIs; raw events and checkpoints support replay, audit and reconciliation.

## Deep dive, failure handling and tradeoffs
Deduplication and state updates must be atomic for the chosen transaction boundary. A seen-event record alone is unsafe if the process crashes before updating state. A pending-to-posted transition needs business identity, not a guess based only on arrival time. Poison events go to an auditable quarantine and do not silently disappear. Backpressure and lag alarms protect recovery; reconciliation detects missing or divergent records. Compare at-least-once plus idempotency with broker transactions and explain cross-database limits. Test duplicate delivery, late events, partial writes and replay after a crash.

## Adaptation
This is an original illustrative practice answer, not a production claim. Recompute
scale and revisit consistency, security and failure decisions for the actual
question. Do not attribute this design or its numbers to the candidate.
