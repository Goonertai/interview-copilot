# Payment processing / ledger

## Example question
Design a payment service that prevents duplicate charges and supports reconciliation.

## Scope and illustrative estimates
I would clarify authorization/capture/refund flow, external processors and currencies. Keep account balances correct before optimizing throughput. Monetary amounts use integer minor units with an explicit currency; never floating-point arithmetic.

## Example architecture and data flow
Create a payment intent keyed by merchant and idempotency key, storing a request fingerprint. Use a transactional ledger with balanced debit/credit postings and an outbox for downstream work. Processor calls happen outside a long database transaction and use stable processor idempotency keys. Persist explicit states such as pending, authorized, captured, failed and refunded.

## Deep dive, failure handling and tradeoffs
The invariant is balanced entries and no duplicated logical posting. Enforce ledger uniqueness and per-account concurrency rules in durable storage, not a cache lock alone. A timeout leaves an unknown outcome: query/reconcile rather than blindly charge again. Signed webhooks may duplicate or arrive out of order; apply allowed state transitions and audit every transition. Reconcile processor settlements against internal postings and route mismatches to review. Explain saga/compensation limits: a refund is a new auditable action, not deletion of history. Monitor pending age, mismatches and duplicate attempts; test retries at each crash boundary.

## Adaptation
This is an original illustrative practice answer, not a production claim. Recompute
scale and revisit consistency, security and failure decisions for the actual
question. Do not attribute this design or its numbers to the candidate.
