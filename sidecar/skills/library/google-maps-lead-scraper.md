---
name: Google Maps Lead Scraper (Kit)
slug: google-maps-lead-scraper
description: Run the free open-source Google Maps Scraper Kit locally and let Claude drive it on autopilot — give it a city + business type, get back a clean lead list (name, phone, email, website, address, rating, optional socials) with zero per-lead cost.
category: Research
requires: [dish, cabinet, workbench]
license: MIT
default: false
---

Source: Bambú directive 2026-09-14 (YouTube Short https://youtube.com/shorts/q1y8W2e4J44).
Upstream kit: https://github.com/Mahanaicoach/google-maps-scraper-kit (MIT), a thin wrapper around gosom/google-maps-scraper by Georgios Komninos (MIT). The kit adds one-command Docker setup, ready-to-run scripts, and a Claude skill.

Use for: building local-business lead lists for a defined city + vertical at $0 marginal cost — feed for Client Presence Audit, Dataset Harvest, speed-to-lead prospecting, and niche discovery. Do NOT use for social-media scraping (it cannot touch Instagram/TikTok/YouTube beyond reading socials linked on a business's own website) and do NOT use it as a substitute for an approved/authoritative source when a contract demands provenance.

## What it returns

Clean lead rows by default: name, phone, email, website, category, address, rating, review count (~34 raw fields captured, noise stripped). Optional `--socials` pass pulls Instagram/Facebook/LinkedIn links from each business's own website in plain code (no AI tokens). Results are leads to verify, not a redistributable dataset.

## Method

1. **Stand it up locally.** Clone the kit, `docker compose up -d`, health-check `curl http://localhost:8080/api/v1/jobs`. Binds to 127.0.0.1 only; secrets are git-ignored. Runs fine on the VPS or an operator workstation — one cheap probe first, and if Docker is constrained on srv1099662 run it elsewhere rather than adding load to the box.
2. **One bounded query per job.** City + business type + `depth` (start at 5, raise only as needed). Prefer the scripts (`scripts/scrape.sh` / `scrape.py`, no Python deps) or the kit's Claude skill for create -> poll -> download -> clean. Enable email extraction only when emails are actually needed (much slower).
3. **Respect the rate-limit reality.** This runs a real scraper against Google Maps. Big back-to-back jobs, high depth, many keywords, or scheduled runs without proxies can get the runner IP temporarily rate-limited (clears in minutes-hours; jobs return empty/failed meanwhile). Watch for block signals: failed jobs, suddenly empty results, far fewer rows than an identical earlier run. One job at a time; add proxies for large or repeated runs.
4. **Deliver like Dataset Harvest.** Fix the output schema before scaling, keep per-row source traceability, and report an honest count of what could not be collected. Leads go to a human queue or the owning district's pipeline — never straight to outreach.

## Boundaries (standing)

- Scraping Maps is against Google's ToS; use responsibly and follow data law (GDPR/CCPA/CAN-SPAM) for any contact data. Flag target-specific ToS/legal exposure instead of building around it.
- No live outbound from scraped rows without the existing compliance gate and explicit owner approval — a lead list is not a send instruction.
- Never resell raw Google data.
- Akash lane: this kit is registered in the speedtolead repo (docs/icm/GOOGLE_MAPS_LEAD_SCRAPER.md) as the $0 local lead-sourcing option for Polesitter research slices.
