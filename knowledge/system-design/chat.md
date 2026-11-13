# Messaging / chat

## Example question
Design a messaging service with small group chats and offline delivery.

## Scope and illustrative estimates
I would first clarify group size, retention, ordering and encryption. Assume 10 million daily users sending 40 messages each: about 4,630 messages/s average before fan-out. I would require per-conversation order, not a global message order.

## Example architecture and data flow
Clients maintain authenticated WebSockets to connection gateways. A message service assigns a conversation-scoped sequence and persists the message before acknowledging acceptance. Partition message history by conversation and time bucket. Delivery workers route to online recipients; offline devices resume from a cursor. Media bytes live in object storage, with access-controlled references in messages.

## Deep dive, failure handling and tradeoffs
A client-generated message ID makes retries deduplicable; delivery ACKs and cursors tolerate repeated delivery. Distinguish accepted, delivered and read states. Gateway failure causes reconnect and replay from the durable cursor. A large group needs a different fan-out strategy and bounded queues. Compare server-readable history with end-to-end encryption and multi-device key management; do not assume both are free. Monitor message acceptance latency, delivery lag, reconnect rate and backlog; exercise duplicate sends and a gateway crash.

## Adaptation
This is an original illustrative practice answer, not a production claim. Recompute
scale and revisit consistency, security and failure decisions for the actual
question. Do not attribute this design or its numbers to the candidate.
