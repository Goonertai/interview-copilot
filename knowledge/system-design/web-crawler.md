# Distributed web crawler

## Example question
Design a distributed web crawler that avoids overwhelming websites.

## Scope and illustrative estimates
I would clarify crawl scope, freshness, robots policy and content size limits. Assume 100 million pages/day averaging 100 KB: about 1,157 fetches/s and 10 TB/day before compression and deduplication. Host-level politeness determines achievable throughput.

## Example architecture and data flow
A durable URL frontier tracks canonical URL, host, due time and crawl state. A scheduler leases work with per-host rate limits; fetch workers enforce robots rules, timeouts, content-type and size caps. Parsers extract links; canonicalization and deduplication feed unseen URLs back into the frontier. Store content separately from crawl metadata.

## Deep dive, failure handling and tradeoffs
Lease expiry permits recovery but can create duplicate fetches, so completion writes are idempotent. Avoid infinite URL spaces with depth/domain budgets and query normalization; exact dedupe may complement a probabilistic filter rather than blindly trusting it. Compare freshness prioritization with broad coverage. Guard against SSRF by blocking internal destinations and checking redirects/DNS results. Monitor per-host rate, frontier age, duplicate rate and parse failures. Test a worker crash, redirect loop and malicious destination.

## Adaptation
This is an original illustrative practice answer, not a production claim. Recompute
scale and revisit consistency, security and failure decisions for the actual
question. Do not attribute this design or its numbers to the candidate.
