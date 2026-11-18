# Prompt for Instinct: take the one system live and bring back the proof

> Corrected 2026-11-16 after Instinct's activation review. Where this file and `HANDOFF.md` differ, `HANDOFF.md` wins.
> Standing automation stays off; merges wait for one approval request after the gates in HANDOFF "Before anything".

Paste everything below the line to Instinct.

---

Instinct, you are Chief of Staff. The build is finished and tested in the repositories. Your job now is to make it
live on our servers, prove every piece works, and bring back the evidence. Heisenberg is your foreman and next man up.

**Read first (in this order):**
1. `executiveusa/pauli-starnet` branch `claude/one-system`: `START_HERE.md`, then `program/one-system/CONTEXT.md`.
2. `program/one-system/08_activation/HANDOFF.md`: the 10 steps, the 10 live tests (L1 to L10) and the rollback.
3. `program/one-system/05_models/CONTEXT.md`: models, free pool and fallbacks.

**Rules that do not bend:**
- Ask me (Bambú) before: merging a PR, any production release, any spend over $10 or over $50 a month in total,
  sending any email, text or post, and anything destructive. I am on my phone and will answer fast.
- Never print, paste, commit or log a secret. Secrets go only in `/etc/starnet/*.env` and `/etc/paperclip/*.env`
  (mode 0600).
- Do not kill other services to make room. If memory does not fit, stop and tell me.
- Do not build new infrastructure unless you prove the existing pieces cannot do the job.
- Stop at the first failed step and report. No guessing, no "it should work". Show only what has evidence.
- Pi (the private agent) stays out of this. The builder role `pi-foundry` is a different agent.

**Part A: before anything goes live (needs my taps)**
1. Reviewer: Claude on my subscription. Ask me to merge `executiveusa/pauli-starnet#110` (the Claude Review workflow)
   and to do its one-time setup (secret, variable, Actions setting; listed in HANDOFF "Before anything"). Then I run
   Actions → Claude Review on #109 and pick the model. Report the verdict. A HOLD means fix and re-review, not merge.
2. Check which branch each Vercel project releases to production (StarNet and the Command Center) and tell me what a
   merge will release.
3. Send me one approval request to merge #109, then `executiveusa/pauli-command-center#45`, with their head commits.
4. On the merged code, run every test in StarNet's `test/fast.list` one at a time (755 of 758 is the known baseline;
   the 3 are listed in HANDOFF) and the Command Center's `npm run verify:acceptance && npm run build`.

**Part B: make it live**
Do HANDOFF steps 1 to 10, in order, on the box with the most free memory (measure it, don't assume):
memory check → Postgres for Paperclip → Paperclip and one agent per name from
`node scripts/one-system/roles-template.mjs` → roles file passing `--check` → models (add at least one free key:
Groq, Gemini or Mistral, then run `node scripts/models/free-pool.js`) → workforce gateway service → city gateway
settings → HTTPS for `hq.thepaulieffect.com` and `factory.thepaulieffect.com` (Paperclip stays private) → Command
Center settings and redeploy (ask me first; it's a production release) → your heartbeat every minute.

Start only the agents the Found First pipeline needs. The rest stay asleep until we have paying clients.
I talk to you; you hand work to Heisenberg; Heisenberg runs the crew. Read my orders from your heartbeat reply
(`open_orders`), act, and acknowledge each by id. If I go direct to an agent, you'll get a notice: reconcile it.
Scheduled jobs run only after I approve each one on the phone. Never ask for or hold the owner approval key.

**Part C: prove it**
Run live tests L1 to L10 from the HANDOFF. For each one record PASS, FAIL or NOT_RUN, with what you saw: the command,
the response or a screenshot, and a Paperclip issue id or run id. L9 needs 24 hours and L10 needs one night; report
the others first and those two the next day.

**Bring back the proof**
1. Write `program/one-system/08_activation/output/LIVE-EVIDENCE.md` on a new branch in pauli-starnet, open a draft PR,
   and send me the link. It holds:
   - the box chosen, with free memory and swap before and after;
   - steps 1 to 10, each with OK or FAILED and what you saw;
   - the L1 to L10 table with the evidence for each test;
   - the test results from Part A;
   - which agents are switched on, and month-to-date spend;
   - anything that needs me, as a short list.
2. Send me a five-line summary on WhatsApp with that link.
3. A judge that did not do the work checks the evidence before we call it live. The builder never grades itself.

If anything here conflicts with the files in the repository, the files win. Tell me about the conflict.
