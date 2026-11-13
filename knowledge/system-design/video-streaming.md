# Video upload / streaming

## Example question
Design a video upload and on-demand playback service.

## Scope and illustrative estimates
I would separate on-demand video from live streaming and clarify rights and geographic reach. Assume 100,000 uploads/day at 200 MB each: 20 TB/day of original uploads. Delivery bandwidth, not only request QPS, drives the serving design.

## Example architecture and data flow
Clients upload originals to object storage through scoped URLs. A durable job pipeline validates and transcodes into multiple renditions and segments. Metadata records processing state and manifests. Playback APIs authorize viewing and return a manifest; a CDN serves immutable segments from object storage. Metadata/search workloads remain separate from bulk media.

## Deep dive, failure handling and tradeoffs
Publish a rendition only when its required segments are durable. Transcode jobs use stable job IDs, bounded retries and poison-job isolation. A failed worker can resume or retry without publishing a partial video. Compare eager versus popular-content-first transcoding and CDN cache efficiency versus revocation latency. Live streaming would require a different ingestion/latency path. Track time-to-playable, job lag, playback startup, rebuffering and origin egress; test partial failures and regional CDN degradation.

## Adaptation
This is an original illustrative practice answer, not a production claim. Recompute
scale and revisit consistency, security and failure decisions for the actual
question. Do not attribute this design or its numbers to the candidate.
