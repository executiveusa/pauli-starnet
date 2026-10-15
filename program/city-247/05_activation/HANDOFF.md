# city-247 activation — the steps only Bambú and Instinct can do

Written 2026-10-15 by the builder session. Everything below was built and tested in the builder's container and
pushed to `executiveusa/pauli-starnet` branch `claude/multi-agent-architecture-qc3xrf` (draft PR #62). Nothing here
has run on a server yet. Each step ends with a check whose expected output is written next to it. Secrets are
named, never shown; values live in Infisical (project HERMES).

## 0. Merge
Review and merge PR #62 into `feat/harness-backend`. CI on the branch: see the PR. The fast-list tests added by this
work (`knowledge`, `district-foreman`, `review-gate`, `first-lanes`) pass in the builder's container (receipts in
`01_knowledge` … `04_first_lanes`). Pre-existing, not from this work: `qa-product-perfect-claims.test.js` fails the
same way on the clean base (a release path list missing `frontend/app/jev-control.js`), and `lint-determinism` reports
13 old findings; neither touches these files.

## 1. Database: the knowledge base on the self-hosted Supabase (Instinct)
Facts from Instinct (2026-09-27, UNVERIFIED by the builder): Supabase runs on the old server as docker project
`supabase`, Kong on `127.0.0.1:8001`.
```sh
cd /opt/pauli-starnet && git pull                              # path UNVERIFIED: wherever the city is checked out
DB=$(docker ps --format '{{.Names}}' | grep -E 'supabase.*db' | head -1)   # container name UNVERIFIED
docker exec -i "$DB" psql -U postgres -d postgres -v ON_ERROR_STOP=1 < db/migrations/20261015_0001_knowledge.sql
node scripts/knowledge/ingest.js --out /tmp/knowledge.sql --manifest /tmp/manifest.json
docker exec -i "$DB" psql -U postgres -d postgres -v ON_ERROR_STOP=1 < /tmp/knowledge.sql
docker exec -i "$DB" psql -U postgres -d postgres -Atc "select count(*) from kb_documents"   # expect 436
```
Server-held sources (load on the box that has them, then pipe the SQL into the same database):
```sh
# NEW box: Jasper's 50 (path from Instinct 2026-10-12, UNVERIFIED)
node scripts/knowledge/ingest.js --only jasper-smart-sites --dir jasper-smart-sites=/root/jasper-highlevel-transcripts/selected50 --out /tmp/jasper.sql
# old box: Manny's 315 Hormozi transcripts (find the folder first: the manny-the-manager transcript store)
node scripts/knowledge/ingest.js --only manny-hormozi-315 --dir manny-hormozi-315=<that folder> --out /tmp/manny.sql
```
Both are safe to re-run. Check: `select source_id, count(*) from kb_documents group by 1` lists them.

## 2. Gateway: point it at the database and restart (Instinct)
Add to the gateway's environment (names only): `KB_SUPABASE_URL` (the Kong URL, e.g. `http://127.0.0.1:8001`),
`KB_SUPABASE_SERVICE_KEY` (the Supabase service-role key). Restart the gateway (pm2 `pauli-gateway`).
Check: `curl -s -H "Authorization: Bearer $GATEWAY_BEARER_TOKEN" "$GW/v1/knowledge/search?district=impact&q=grant%20or%20donor"`
returns `"backend":"supabase"` and cited passages. Without the two variables it answers `"backend":"files"` (repo only).

## 3. The 24/7 tick (Instinct)
```sh
cp deploy/systemd/starnet-foreman.service deploy/systemd/starnet-foreman.timer /etc/systemd/system/
# /etc/pauli-starnet.env needs: GITHUB_TOKEN (read issues on executiveusa/pauli-starnet), GATEWAY_BEARER_TOKEN;
# optional GATEWAY_URL (default http://127.0.0.1:4000), FOREMAN_GITHUB_WRITE=1 (comment + label results)
systemctl daemon-reload && systemctl enable --now starnet-foreman.timer
systemctl list-timers starnet-foreman.timer        # expect a next run within 5 minutes
journalctl -u starnet-foreman -n 20                # one line per district: RUNNING / BLOCKED / IDLE
```
`WorkingDirectory=/opt/pauli-starnet` in the unit is UNVERIFIED: set it to the real checkout. Check:
`GET /v1/districts` returns 12 districts, `stale: false`.

## 4. The queue (Bambú)
1. Turn on Issues for `executiveusa/pauli-starnet` (Settings > General > Features > Issues). It is a fork, so they
   are off; until then the three active districts show BLOCKED with this exact reason (live proof in `04_first_lanes`).
2. Seed the first work: `GITHUB_TOKEN=… node scripts/queue/seed.js program/city-247/04_first_lanes/seed-issues.json`
   (8 issues, none approved; the labels already exist).
3. Add the label `approved` to the items you want run. The next tick dispatches them.

## 5. The review gate (Bambú)
1. Create a separate reviewer GitHub identity (an auditor bot account or a teammate). The builder's PRs are
   authored by executiveusa, so executiveusa can never be their independent reviewer (live proof in `03_review_gate`).
2. Repository variable `REVIEW_GATE_REVIEWERS` = that login. Optional `REVIEW_GATE_REQUIRED_CHECKS`.
3. Branch protection on `feat/harness-backend`: require the status `starnet/review-gate`.

## 6. Rotate (Bambú)
Secrets seen in the uploaded two-month chat are compromised (types only): a Stripe live secret key, a
`STARNET_DEVICE_TOKEN`, two vault/secret share strings (Oct 8 and Oct 9), an AWS temporary session token in a
signed link (likely expired), and one reused test password. Rotate the Stripe key first.

## What is honestly still open
- Nothing here has run on the server; the first real crew mission per lane is the proof still owed.
- Etsy's live API spec and Google's program pages were not reachable from the builder's container: the Etsy
  payload fields and the Google program table are marked UNVERIFIED in the code and docs.
- The store (Commerce) is blocked on its own open decisions 0002, 0004, 0009 and seller of record.
- AndrooAGI study: still unlocated. Stefan's raw transcripts: unlocated (the synthesis is in impact-city-2026).
- Cloudroom: self-hosting is documented as of its 2026-10-14 release (Ubuntu 24.04, one script, a fresh VM per
  trusted user, no Docker socket). Deferred per Q11; not installed.
