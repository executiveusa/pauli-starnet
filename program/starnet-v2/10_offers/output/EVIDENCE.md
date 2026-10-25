---
stage: 10_offers
status: blocked
blocker: builder - on the VPS, start each offer once on a sample job (POST /v1/offers/<id>/start with a sample manuscript, a demo business brief, and sample client documents in jobs/<job_id>/), let the green steps run, and have a different model family than the builder check every deliverable against the step's list; attach the outputs and the judge's report
built_by: claude-session-01UT634v
verified_by:
commit: executiveusa/pauli-starnet@claude/multi-agent-architecture-qc3xrf
proof:
  - node test/offers.test.js -> 23/23 (all three templates pass the check against the real persona library + district registry; plan() output is valid GREEN MissionEnvelopes; gated steps never become missions; inputs are pattern-checked)
  - node test/city-live-board.test.js -> 45/45 (GET /v1/offers; POST /v1/offers/kindle/start dispatches 4 green steps and stops at the client send; the job is live revenue-district activity; the kill switch stops a job at its first step)
---
Templates in registry/offers: kindle (16-step workflow in _shared/workflows), smart-sites (brief -> PRD -> design -> factory
intake [captain] -> factory build + security + judge -> client preview [captain] -> go-live [red]), ai-employee (discovery ->
wiki -> Instinct persona -> crew -> WhatsApp guide -> judged rehearsal -> the client's number [red] -> contract [red]).
Every green step names an allowed persona; every template has a judge step and a red step. Intents reference jobs/<job_id>/
files and never embed client names or contacts.
