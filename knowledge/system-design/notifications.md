# Notification delivery

## Example question
Design a multichannel email, SMS and push notification service.

## Scope and illustrative estimates
I would clarify transactional versus promotional messages, latency and opt-out rules. Assume 50 million notifications/day: about 579/s average before channel fan-out. Separate urgent transactional traffic from bulk campaigns.

## Example architecture and data flow
An authenticated API accepts an idempotency key and records notification intent with an outbox event. Preference evaluation selects permitted channels; queues isolate channel, priority and provider. Workers render versioned templates and call provider adapters. Store attempt state and provider receipts; consume authenticated callbacks for status updates.

## Deep dive, failure handling and tradeoffs
Acceptance does not mean external delivery. Dedupe logical notification IDs and reconcile ambiguous provider timeouts; provider-side idempotency matters for avoiding repeated sends. Retry transient failures with exponential backoff, jitter and attempt limits, then dead-letter for investigation. Rate-limit provider calls and prevent a campaign from starving urgent messages. Compare at-least-once delivery with the practical cost of duplicates. Monitor age-of-oldest message, delivery success, opt-out violations and provider throttling; test callback duplication and provider outage.

## Adaptation
This is an original illustrative practice answer, not a production claim. Recompute
scale and revisit consistency, security and failure decisions for the actual
question. Do not attribute this design or its numbers to the candidate.
