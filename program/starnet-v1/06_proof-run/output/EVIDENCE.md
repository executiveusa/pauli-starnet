---
status: blocked
built_by: instinct
blocker: human steps pending - captain's city-view movement check and captain's own spoken voice test (simulated voice run is labeled SIMULATED and never counts as his)
verified_by:
  _rule: verified_by must NEVER equal built_by; the builder does not verify its own work. Auditor verifies Instinct-built parts (terabithia#32, #34, #35, pauli-starnet#47, this proof run). Auditor or Bambu verifies builder work (stages 02-05, #41, #43, terabithia#24, #27). Bambu referees disagreements.
  section_1_mission: ""
  section_2_front_door: ""
  section_3_negative_tests: ""
  section_4_rerun_results: ""
  section_5_ledger: ""
  receipts_chain: ""
  crew_mission: ""
---

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
Re-run 2026-09-27 01:11 CST after terabithia PR #32 (5ade6e9, deployed) - refusals now hold at the POLICY layer:

Publish probe (raw POST /api/v1/intents response):
{"status":"needs_human","mission.permissions":["action.write"],"result.human_blocker.title":"Publish/spend-class city work parks for the captain","result.summary":"Parked at the policy layer: Publish/spend-class city work parks for the captain"}
No foreman run was created. The intent is stamped publish-class and parked before any dispatch.

Pi probe (raw POST /api/v1/intents response):
{"status":"needs_human","result.human_blocker.title":"Sealed personal lane: the fleet control plane does not dispatch to Pi","result.summary":"Parked at the policy layer: Sealed personal lane: the fleet control plane does not dispatch to Pi"}
No invoke, no agent run. Personal-lane intents park at the policy layer with a human_blocker.

Golden path re-verified in the same run: research intent POST stamped permissions=["research"], foreman run completed status=done, receipt rcpt_a3f8b75c-0ab0-4960-8238-727399b5a88e, real sourced fact returned (EIA Texas solar capacity). The policy layer parks publish-class and personal-lane work while research flows.

Gateway empty-permissions probe (post-#47, LIVE production gateway HEAD f0520dac, 2026-09-27 08:23 UTC):
POST /v1/missions with permissions: [] => status needs_human, human_blocker "Captain approval needed", runtime.run_id null (nothing ran), evidence ref git:f0520dac. The empty-permissions envelope PARKS at the production gateway - the tierOf fail-closed behavior verified live, not just at code level. Full raw headers+body: probe3 artifact delivered to the auditor with this packet.

## 5. What it took to get here (honest ledger)

Five live attempts, four real bugs fixed en route (all via PR + codex cycle):
- #25 (router: personal-intent beats preferred_agent), #26 (store readback dropping mission.result), instinct-voice-agent#3 (no receipt = do not speak) - merged earlier.
- #28 maxx_runs FK row missing (merged ae94e263), #29 circular mission/run FK ordering + link retry (merged 80fee782), #30 maxx_events.sequence is GENERATED ALWAYS identity (merged 4ce519ec).
- Gateway/sidecar ops: pauli-starnet service restarted onto d0467a8 (sidecar was running pre-foreman code -> STARNET 404); STARNET_DEFAULT_MODEL set (foreman had no model configured). /etc/pauli-starnet.env backed up (chmod 600) before edit.
- OpenRouter free pool: legacy :free slugs (deepseek-v3.1, llama-3.3-70b, gemma-3) now 404 "unavailable for free"; current catalog has 17 :free models; several 429 under shared-pool load; nemotron-3-super-120b-a12b:free answered and ran the mission.

Raw run artifacts on the old box: /tmp/golden-mission.json (intent POST response), /tmp/golden-final.json (gateway final envelope), /tmp/neg-publish.json + /tmp/neg-publish-final.json (negative test 2).

## 6. Crew mission (stage 04) - two runs, told straight

### Run A: db1f579a-5fab-44aa-b3e6-cf660c9377a6 (2026-09-27 08:20 UTC, gateway f0520dac)

What this run honestly proves (narrow claim, per independent audit): **a real foreman dispatched two native crew members and returned an answer, with one failed leg correctly marked in crew[]**. It does NOT prove two-crew success:

- solo: false; crew = [scout bf9d90ef-e03c-4a5f-b63f-9a5c9ca1c8d5 status **failed** (cancelled after 14 turns), analyst 380ccd2f-62b6-4197-b0d3-445522ad04f5 status done (14 turns)]
- The synthesized brief draws on the analyst's fetches; no usable scout finding is attributed in the brief.
- receipt rcpt_864d7efa-2409-45ed-8aa8-26ac32fd1fa4; fresh-chain verify {"ok":true,"count":1} at the time.
- **Audit gap called out**: the parent envelope's `failures: []` stayed empty even though a worker leg failed - the gateway ResultEnvelope does not surface worker failures. Logged as code nit N1 (ride-along PR).

### Run B (re-fire): c6d0eacd-d71e-4932-bd5c-9504649756e8 (2026-09-27 09:51 UTC, gateway f0520dac)

Fired after the dispatch outage repair (see section 7). Brief tightened per audit guidance (each worker capped at 3 searches + 2 fetches, then write and stop):

- solo: false; crew = [scout b02d493b-9d28-4717-8f22-b23d9b91ff10 status **done** (6 turns, ~67s), analyst ad73ba40-00e5-4030-bb48-edaab1d34328 status **done** (8 turns, ~116s)]; foreman run 803cea2f-e9f2-4b88-872d-0ae33e0616ba reason done.
- receipt rcpt_4dcb91c6-ef83-4203-a929-4023152bcf40 (tier GREEN); board GET shows both mission and receipt; fresh-chain verify {"ok":true,"count":8}, exit 0.
- Independent audit signed stage 04 at code/HTTP level on this run (two-crew success + merged result). Remaining before full sign-off: the captain's human city-view movement check (his step).

Raw artifacts for both runs: terabithia mission GET, gateway mission GET, crew run excerpts (start/end/turns/reason per worker + foreman), receipt objects, board GETs - delivered to the auditor as files alongside this packet.

## 7. Dispatch outage (09:46-09:52 CST) - disclosed, root-caused, fixed

Between Run A and Run B all starnet dispatches failed ("STARNET 403", then a misleading "connect a GROQ API key"). Root cause: TWO competing sidecar units existed - the real `pauli-starnet.service` (EnvironmentFile=/etc/pauli-starnet.env) and a stale duplicate `pauli-starnet-sidecar.service` (stale token, no env file). An ops restart at 09:46 let the stale duplicate take :8787. Fix: duplicate stopped+disabled (unit file preserved), two zombie sidecars from Sep 22 killed, real unit restarted and verified owning 127.0.0.1:8787. Proof: direct sidecar /api/run (run 734a3e3c-4c43-4090-a692-b7bc0a78f8d2) completed done/2 turns/$0 on the nemotron free lane. The 6 failed receipts in the current chain (rcpt_2028bb59..rcpt_aab02459) are this window's debug missions - kept in the chain, honestly sealed as failed.

## 8. Voice front door (SIMULATED captain - labeled; the captain's own spoken run remains the gold acceptance check)

Deployment: prod 2.25.241.209, /opt/instinct-voice-agent at 84c7b7e (contains PR #2; 127.0.0.1 host-pin re-applied after FF deploy, backup kept). Bridge env (names only): TERABITHIA_URL=http://127.0.0.1:13050 (SSH forward to old box :3050 via terabithia-tunnel.service, dedicated restricted ed25519 key), INSTINCT_TERABITHIA_TOKEN (= TERABITHIA_API_KEY; no scoped-token support exists in terabithia - minting one is a PR, flagged), LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET. A vault GROQ_API_KEY was tried and REMOVED (invalid, 401).

Simulated pipeline proof (run13, room pauli-web-1d559fe0): agent heard an espeak-generated captain mission via LiveKit inference STT (deepgram; the only supported inference STT provider), inference LLM openai/gpt-oss-120b answered keyless, the agent CALLED dispatch_mission (3 attempts), and SPOKE the outcome transcript (which was the then-active 403 outage). Method note: LiveKit cloud dispatch to the self-hosted worker proved flaky, so the evidence runs attach the worker directly via iva_connect_8083.py connect --room with a scripted captain participant replaying the wav.

Golden simulated runs (2026-09-27 10:06-10:24 UTC):

- run14 (room pauli-web-178006df): pipeline worked end to end and FAILED HONESTLY - STT misheard the espeak audio ("three point brief" became "$3.3k batch of Texas solar leads"), terabithia routed the heard buy-class content to the unwired hermes lane and sealed a failed receipt ("Agent invocation failed: fetch failed"). Kept as negative evidence that routing follows the heard content.
- run15 (room pauli-web-9a58d541, clearer wav): agent heard the research mission via deepgram STT, passed its confirmation gate, and CALLED dispatch_mission. Terabithia mission fe6089db-81a0-4282-ab72-3b72260c4f8c (permissions [research]) ran on Heisenberg and completed DONE with receipt rcpt_ac8ab4f6-ee75-4b1b-9bc1-b93103e57ea6 (real sourced brief: Texas Comptroller $21B total solar investment context, lead-pricing ranges). Board GET shows BOTH the mission and the receipt. Spoken agent lines captured verbatim: "Hey, Instinct here. I'm listening." and "Got it - mission's already rolling. I'll ping you as soon as the brief comes back."
- Process/revision binding: iva_connect_8083.py pid 753602, /opt/instinct-voice-agent at 84c7b7e (contains PR #2), terabithia-tunnel.service active (127.0.0.1:13050 to old box :3050, restricted dedicated key). Bridge env names only: TERABITHIA_URL, INSTINCT_TERABITHIA_TOKEN, LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET.
- Limitation, stated plainly: the scripted captain's listen window ended before the free-lane mission finished, so the agent's FINAL receipt-citing spoken answer was not captured. The receipt, board row, mission record, and dispatch tool-call are the hard evidence; the captain's own spoken run remains the gold acceptance check (his step).

### Code nits logged for the ride-along PR
- N1: gateway ResultEnvelope `failures: []` masks worker-leg failures (should surface worker failures).
- N2: human_blocker copy for blank permissions should say "no permissions declared".
- N3 (minor): verify:receipts CLI prints JSON without the process exit code on stdout; exit code stated in this packet's text.

### Packet files (this directory)
- verify-receipts-20260927.txt - fresh-chain verify stdout ({"file":"data/receipts.jsonl","ok":true,"count":8}; exit 0).
- receipts-chain-20260927.jsonl - all 8 receipt objects of the current chain, unredacted (ids + hashes only, no secrets), so the full chain recomputes end to end.

Raw auditor files added post-review (builder ask, 2026-09-27 10:21 CST): crew2-run-excerpts.json, crew2-board-get.json, crew2-terabithia-mission-get.json, crew2-gateway-mission-get.json, crew2-receipt-rcpt_4dcb91c6.json, crew2-verify-receipts.txt - the raw artifacts behind the crew two-clean-legs claim, so anyone can recompute without asking the auditor.

Raw auditor files for crew Run A added (builder handoff 2026-09-28): crew1-run-excerpts.json, crew1-runs.jsonl, crew1-board-get.json, crew1-terabithia-mission-get.json, crew1-gateway-mission-get.json, crew1-receipt-rcpt_864d7efa.json, crew1-verify-receipts.txt - the raw artifacts behind the Run A claim (receipt rcpt_864d7efa), previously held only by the auditor.
