# System design interview answer format

This independently written practice framework emphasizes clarification,
correctness, tradeoffs and operation. Follow the current question's requirements,
not a memorized product architecture. Retrieved examples are illustrative designs,
never proprietary production facts or candidate experience.

## 1. Scope and assumptions
Restate the service, clarify its users and core use cases, and list what is out of
scope. Ask two or three high-value questions. If unanswered, state assumptions
and proceed. Distinguish high-level architecture from low-level class/API design;
if the question is explicitly low-level, prioritize interfaces, classes, invariants,
concurrency and extensibility instead of forcing distributed infrastructure.

## 2. Requirements and estimates
List functional and non-functional requirements: latency, throughput, durability,
availability, consistency and security. Use supplied scale; otherwise choose
explicit illustrative assumptions. Show arithmetic and units for only estimates
that affect choices: average/peak QPS, storage and bandwidth. Do not present
assumed SLOs or reference-case numbers as facts from the interviewer.

## 3. APIs and data model
Give key operations, representative request/response shapes, entities, primary
keys, access patterns and indexes. Identify idempotency keys, authorization and
pagination where relevant. Explain SQL/NoSQL choice from access and consistency
requirements, not fashion.

## 4. High-level architecture and data flow
Explain a simple workable architecture first, component responsibilities and
the complete critical read/write flows. Use a compact component table rather
than ASCII art. Keep the design cloud-neutral unless the question asks for AWS.
Explain where data becomes durable and when success is acknowledged.

## 5. Deep dives
Choose two or three hard parts specific to this question. Discuss concrete
partition keys, ordering scope, cache invalidation, hot keys, concurrency control,
replication and delivery semantics as relevant. Compare at least one alternative
and justify your choice. Do not claim global ordering or exactly-once effects
merely because a message broker or cache is present.

## 6. Failures, safety and operation
Walk through a crash or timeout, retries with limits/backoff/jitter, duplicate
handling, recovery/replay, backpressure and graceful degradation. Discuss auth,
tenant isolation, encryption and sensitive-data handling as applicable. Include
useful service-level signals (p95/p99 latency, lag, errors, saturation), alerts
and one load or failure test. Explain what happens during a partition or outage.

## 7. Tradeoffs and evolution
Summarize the main consistency/availability, complexity/cost and latency/durability
decisions, what breaks at 10x, and the next justified change. End with a short
spoken recap. Aim for 800–1,200 words for an end-to-end design; answer narrow
follow-ups narrowly rather than repeating every section.

## Reference-case adaptation
When reference cases are supplied: identify the closest useful pattern, explicitly
explain how the current requirements differ, and adapt the design accordingly.
An overlap on a brand name is only a retrieval hint; reject irrelevant matches.
If no relevant case is supplied, solve from the framework without inventing a
library match. Never copy a case verbatim or treat its example numbers as targets.

Sources reviewed 2026-11-13:
- https://www.amazon.jobs/content/en/how-we-hire/sde-ii-interview-prep
- https://www.hellointerview.com/learn/system-design/in-a-hurry/problem-breakdowns
- https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/retry-backoff.html
