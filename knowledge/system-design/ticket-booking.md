# Ticket / inventory reservation

## Example question
Design a ticket booking system that cannot sell a seat twice.

## Scope and illustrative estimates
I would clarify assigned seats versus general admission, hold duration and payment behavior. Assume an event with 50,000 seats and a short high-demand sale; aggregate capacity does not eliminate contention for one seat.

## Example architecture and data flow
A waiting room and rate limiter protect browsing and checkout. Seat lookup can use a cache, but hold acquisition uses a conditional durable transition from available to held with owner, expiry and version. Confirmation atomically verifies the live hold and changes it to sold; payment state is coordinated by a retryable workflow.

## Deep dive, failure handling and tradeoffs
The invariant is at most one confirmed buyer per seat. Expired holds are logically invalid even before cleanup; reclaim them with a conditional version check. Fencing/version tokens prevent stale workers from confirming someone else's hold. A payment success after hold expiry needs reconciliation and a refund policy, not an unconditional seat assignment. Compare reserved inventory with optimistic allocation and partitions by event. Isolate hot events and measure oversells, hold conflicts, queue wait and payment/seat mismatches. Test two buyers racing and a process crash after external payment.

## Adaptation
This is an original illustrative practice answer, not a production claim. Recompute
scale and revisit consistency, security and failure decisions for the actual
question. Do not attribute this design or its numbers to the candidate.
