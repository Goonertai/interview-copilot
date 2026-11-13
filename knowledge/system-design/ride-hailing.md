# Ride hailing / dispatch

## Example question
Design a ride-hailing service that matches riders to nearby drivers.

## Scope and illustrative estimates
I would clarify dispatch radius, update rate and the trip lifecycle. Assume 1 million active drivers updating location every 5 seconds: 200,000 updates/s. Location freshness can be relaxed; assigning a driver to two trips cannot.

## Example architecture and data flow
Location ingestion updates a regional geospatial index with timestamps/expiry. A ride request queries nearby available drivers, estimates pickup cost and sends a bounded sequence of offers. A trip service owns durable trip state; offer acceptance conditionally claims the driver and trip. Persist offer deadlines and version tokens to reject late accepts.

## Deep dive, failure handling and tradeoffs
The invariant is one active assignment per driver and one accepted driver per trip. Cell partitioning speeds proximity search but needs neighboring-cell queries and hotspot handling. The location index is advisory; the durable claim is authoritative. Repeated requests use an idempotency key, while reconnects retrieve current trip state. Compare nearest-driver greediness with batch matching and fairness objectives. Monitor stale locations, acceptance latency, duplicate assignments and cancellations. Test two riders claiming one driver and acceptance after offer expiry.

## Adaptation
This is an original illustrative practice answer, not a production claim. Recompute
scale and revisit consistency, security and failure decisions for the actual
question. Do not attribute this design or its numbers to the candidate.
