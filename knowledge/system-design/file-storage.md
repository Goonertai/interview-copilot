# File storage / synchronization

## Example question
Design a file storage and synchronization service.

## Scope and illustrative estimates
I would clarify maximum file size, sharing, version history and offline edits. Assume 1 million uploads/day averaging 8 MB: 8 TB/day of raw bytes before replication and retention. Metadata access and byte transfer should scale separately.

## Example architecture and data flow
A metadata API authenticates the owner, creates an upload session and issues scoped multipart upload URLs. Clients upload chunks directly to object storage. After verification, a conditional metadata commit publishes a new file version and emits a change event. Model file ID, parent directory, owner, version, checksum and access policy; provide a change cursor for synchronization.

## Deep dive, failure handling and tradeoffs
The current version must reference only complete durable objects. Optimistic version checks surface concurrent edits rather than overwriting silently. Retried finalization uses an upload ID; orphan chunks are garbage-collected after a safe period. Chunk hashes permit integrity checks, but cross-tenant deduplication needs privacy consideration. Compare full-file transfers with chunk reuse. Revoke access on reads and limit signed-URL lifetime. Monitor completion failures, sync lag, checksum mismatch and orphan storage; test interrupted uploads and conflicting edits.

## Adaptation
This is an original illustrative practice answer, not a production claim. Recompute
scale and revisit consistency, security and failure decisions for the actual
question. Do not attribute this design or its numbers to the candidate.
