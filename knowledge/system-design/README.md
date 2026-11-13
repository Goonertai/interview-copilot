# System design practice case library

Reviewed: 2026-11-13. These 14 independently authored examples cover common
practice patterns. They are not a statistical ranking of Amazon interview
frequency, copied course solutions, or descriptions of proprietary architectures.

`index.json` defines aliases, concepts and one sample question for each Markdown
case. Retrieval uses only the current question (never the candidate background
or JD), selects at most two relevant examples, and falls back to the general
framework when there is no match. The model must check relevance and adapt all
requirements and assumptions. Keyword matching can miss indirect paraphrases.

Edit a case's Markdown to maintain its example. Add a unique ID and filename in
`index.json` to add a case. Paths are loaded only from this server-owned manifest.
Rebuild/restart after editing the library. Never store real interview recordings,
credentials or confidential employer architecture here.

## Sources and scope
- Amazon's public SDE II preparation guidance informed the interview framework:
  https://www.amazon.jobs/content/en/how-we-hire/sde-ii-interview-prep
- Hello Interview's author-published catalogue informed common topic selection
  (URL shortener, chat, feeds, file storage, video, rate limiting, ticketing,
  payments, notifications, dispatch, crawling and caching):
  https://www.hellointerview.com/learn/system-design/in-a-hurry/problem-breakdowns
- Public author walkthroughs reviewed for pattern context, not copied answers:
  https://www.hellointerview.com/learn/system-design/problem-breakdowns/bitly
  https://www.hellointerview.com/learn/system-design/problem-breakdowns/whatsapp
  https://www.hellointerview.com/learn/system-design/problem-breakdowns/distributed-rate-limiter
- AWS reliability guidance informed retry/idempotency checks:
  https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/retry-backoff.html
  https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/
- Autocomplete and transaction ingestion extend the case set using general
  indexing, concurrency and event-processing principles. They are original
  practice scenarios rather than claims about question frequency.
