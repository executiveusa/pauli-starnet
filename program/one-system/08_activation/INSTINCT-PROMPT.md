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
1. Review gate on pauli-starnet. Set the repository variable `REVIEW_GATE_REVIEWERS` to the GitHub login of a judge.
   The judge must not be the account that pushed the code (`executiveusa`), because builders can't approve their own
   work. Use your own GitHub bot account or another person I name. That judge reviews PR #109 and approves its latest
   commit. Send me the verdict.
2. Ask me to merge, in this order: `executiveusa/pauli-starnet#109`, then `executiveusa/pauli-command-center#45`.
   Note: PR #109 merges into `feat/harness-backend`, not `main`; tell me if the production branch is different.
3. On a full checkout of each merged commit, run and record:
   - StarNet: `npm run test:fast`. Four tests are known to fail on the old base too; list any others.
   - Command Center: `npm run verify:acceptance && npm run build`.
4. Tell me two account items I must fix myself: GitHub Actions billing on `executiveusa/found-first` (jobs get no
   runner), and the Vercel daily deploy limit on the pauli-starnet project (it clears in 24 hours, or upgrade).

**Part B: make it live**
Do HANDOFF steps 1 to 10, in order, on the box with the most free memory (measure it, don't assume):
memory check → Postgres for Paperclip → Paperclip and one agent per name from
`node scripts/one-system/roles-template.mjs` → roles file passing `--check` → models (add at least one free key:
Groq, Gemini or Mistral, then run `node scripts/models/free-pool.js`) → workforce gateway service → city gateway
settings → HTTPS for `hq.thepaulieffect.com` and `factory.thepaulieffect.com` (Paperclip stays private) → Command
Center settings and redeploy (ask me first; it's a production release) → your heartbeat every minute.

Start only the agents the Found First pipeline needs. The rest stay asleep until we have paying clients.

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
