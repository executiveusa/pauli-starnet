# StarNet v1 Golden Mission - EVIDENCE (Night-1 proof run)

Run date: 2026-09-27 ~06:40-06:50 UTC. Operator: Instinct (Bambu fleet agent), via Terabithia intents API.
Store used for the live run: **MaxxMissionStore on the self-hosted Supabase stack** (durable; not in-memory). Durability proven by service-restart readback (below).

## 1. The mission

POST /api/v1/intents (Terabithia, loopback :3050, bearer TERABITHIA_API_KEY):
```json
{"intent":"Heisenberg, get me a three-point brief on solar leads in Texas","source":"instinct","preferred_agent":"starnet"}
```

- mission_id: `da398e1c-e760-4501-ae89-451af37f7aa0`
- request_id: `req_ba95796a-6a3e-4fe3-9da3-11e045bd51a5`
- trace_id: `trace_af7d2599-79f0-4693-85ce-dbd9caf94e96`
- route: city -> starnet; foreman run id: `bdb2a2ad-330e-4083-9c78-be69dd7a519a` (evidence ref `starnet://run/bdb2a2ad-...`)
- gateway revision at run time: `d0467a8a57d306a7c2ae69e2d6771f6c247c5033` (feat/harness-backend tip; /health shows it)
- Terabithia rev at run time: `4ce519ec24c78d23bbd3e8c45b6f82704c75b030` (main, includes store FK fixes #28/#29/#30)
- foreman model: `nvidia/nemotron-3-super-120b-a12b:free` (OpenRouter free lane, no paid rail)

## 2. Outcome

Status: **done**. solo=true, crew=[] (the foreman judged one angle and ran it solo; doctrine requires crew only for multi-angle missions - noted honestly, no crew task ids exist for this run).
Receipt: `rcpt_4fea24e5-5ca2-4e99-b083-92aaac821df2` (sealed on lazy reconcile; `npm run verify:receipts` => {"ok":true,"count":3}).

GET /v1/missions/da398e1c (gateway) final summary (verbatim, truncated to first 600 chars):
> **Three‑Point Brief: Solar Leads in Texas**

1. **Texas is the nation’s top solar‑installation market** – In 2024 Texas installed 11.6 GWdc of new solar capacity, leading all states for the second consecutive year, driven by data‑center demand and rapid population growth【https://www.conservativetexansforenergyinnovation.org/texas-leads-nation-in-solar-power-installation-report-finds/】. This creates a large, expanding pool of homeowners and businesses evaluating solar, which fuels lead‑generation opportunities.

2. **Lead‑provider landscape is dominated by a few national platforms** – SolarRevi

## 3. Durability proof (Supabase store)

`systemctl restart pauli-terabithia`, then GET /api/v1/missions/da398e1c => status `done`, same receipt `rcpt_4fea24e5`, summary length 2131 chars. The mission, run row, and events live in the self-hosted Supabase (maxx_missions/maxx_runs/maxx_events); nothing was lost on restart.

## 4. Negative tests - CORRECTED after independent audit (2026-09-27)

1. **Bad bearer**: POST /api/v1/intents with an invalid token => HTTP 401. No mission created. (Policy layer; stands.)

2. **Publish request** ("publish a public blog post ... to the live website", mission ca1c280e): **the original claim was overstated.** What actually happened: Terabithia defaulted permissions to [], the gateway's tierOf([]) was vacuously GREEN, and the foreman RAN. The publish did not happen because the unattended surface has no fs_write/external-post capability - capability isolation, not a policy refusal - and the "refusal" text was the model's own after-run words. The run even sealed a receipt (rcpt_e3c4e561). Raw proof: /tmp/audit/publish-* on the old box (POST body, stored envelope with permissions: [], final envelope, events).

3. **City -> Pi** ("Read Pi personal calendar...", preferred_agent pi): same class - it failed at invoke with a 404 because Pi's lane is not wired to the fleet, not because a policy check refused it.

**Fix train (merged or in review at correction time)**: pauli-starnet#45 (tierOf fails closed: empty/missing permissions park, GREEN requires explicit read-scoped permission) + terabithia#32 (policy layer: personal-domain agents not invocable via fleet intents - parked needs_human with no invoke; city intents stamped ['research'] or ['action.write'] with publish-class parked before dispatch; seal() tier fail-closed; dispatch() cannot un-park). After both merge and deploy, BOTH tests re-run and the policy-layer refusal output pasted below.

### Re-run results (policy layer, post-fix)
PENDING - will be filled after #45/#32 merge + redeploy.

## 5. What it took to get here (honest ledger)

Five live attempts, four real bugs fixed en route (all via PR + codex cycle):
- #25 (router: personal-intent beats preferred_agent), #26 (store readback dropping mission.result), instinct-voice-agent#3 (no receipt = do not speak) - merged earlier.
- #28 maxx_runs FK row missing (merged ae94e263), #29 circular mission/run FK ordering + link retry (merged 80fee782), #30 maxx_events.sequence is GENERATED ALWAYS identity (merged 4ce519ec).
- Gateway/sidecar ops: pauli-starnet service restarted onto d0467a8 (sidecar was running pre-foreman code -> STARNET 404); STARNET_DEFAULT_MODEL set (foreman had no model configured). /etc/pauli-starnet.env backed up (chmod 600) before edit.
- OpenRouter free pool: legacy :free slugs (deepseek-v3.1, llama-3.3-70b, gemma-3) now 404 "unavailable for free"; current catalog has 17 :free models; several 429 under shared-pool load; nemotron-3-super-120b-a12b:free answered and ran the mission.

Raw run artifacts on the old box: /tmp/golden-mission.json (intent POST response), /tmp/golden-final.json (gateway final envelope), /tmp/neg-publish.json + /tmp/neg-publish-final.json (negative test 2).
