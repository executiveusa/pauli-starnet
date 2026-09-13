# Finished-video storage: provider options (2026-09-12)

Decision needed from the owner: which provider hosts the finished-video bucket.
Montage's seam is ready: `YAPPY_STORAGE_BACKEND=s3` + bucket/region/endpoint env vars.
All three options are S3-compatible and drop straight in.

| | Cloudflare R2 (RECOMMENDED) | Backblaze B2 | AWS S3 |
|---|---|---|---|
| Free storage | 10 GB-month/mo, every month | 10 GB free (long-standing offer; confirm at signup) | New-account credits only (up to $200 / 6-month free plan, since 2025-07-15) |
| Free ops | 1M Class A + 10M Class B / mo | Free transactions | 20k GET / 2k PUT for 12 mo (legacy tier) |
| Egress | ALWAYS FREE, every tier | Free up to 3x stored volume, then $0.01/GB | Charged per GB (the bill killer) |
| Paid overage | $0.015/GB-mo; $4.50/M Class A; $0.36/M Class B | $6.95/TB/mo | Standard S3 rates |

Why R2 wins for this workload: finished videos are served to public landing pages, so
EGRESS is the dominant cost, not storage. R2 is the only option where serving a million
video views costs $0 in bandwidth. Sources: developers.cloudflare.com/r2/pricing,
backblaze.com/cloud-storage/pricing, aws.amazon.com/s3/pricing (all checked 2026-09-12).

## R2 setup spec (once approved)

1. Cloudflare account (free) -> R2 -> create bucket `starnet-video-exports`.
2. R2 API token (Object Read & Write, bucket-scoped) -> into the vault, never in git.
3. Montage env wiring:
   - `YAPPY_STORAGE_BACKEND=s3`
   - `YAPPY_STORAGE_BUCKET=starnet-video-exports`
   - `YAPPY_STORAGE_REGION=auto`
   - `YAPPY_STORAGE_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com`
4. Public delivery: bind the bucket to a custom domain (e.g. video-exports.<domain>) or
   use the r2.dev URL for the delivery-manifest asset URLs. Custom domain preferred -
   r2.dev URLs are rate-limited for production serving.
5. Capacity read: the full UGC demo set (8 slots x 3 ratios x ~2-4MB) is ~100MB.
   The 10GB free tier holds hundreds of renders; ops stay far under the free caps.

Later option, not now: Cloudflare Stream ($5/1000 min stored + $1/1000 min delivered) if
we ever need adaptive bitrate streaming instead of static MP4s.
