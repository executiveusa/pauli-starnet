# StarNet v2: PRD

Grilled with the captain on 2026-10-25 (Matt Pocock grill-me method). Decision ids are permanent; change one only by a new decision.

## 1. Outcome (D2, D17)
"StarNet works" means, all at once:
1. Any triggered factory job does **real work**, and the captain can **watch the agents do it** in the city view. When an agent needs
   something it **walks to the district** that has it. **Every movement is driven by a real event** (task routed, tool called, result
   posted); an idle agent stands still.
2. **Heisenberg controls everything.** The captain calls StarNet through **Instinct** (primary, voice) or the **command center** (backup).
3. A **board** shows dollars earned, outcomes finished, factory products finished, and spend.
4. The **software factory loop is proven**: up to **5 repos a day**, each sandboxed, grilled with the captain at intake, built to its PRD, and
   **hammered by the security district** on the way out. It ends **~80% done**: backend complete, front end best effort, deployed.
5. The city runs **whole weeks without the captain**, with a daily report from Instinct.

City view: run on the **existing working 2D world now**. The new **3D world + interactive agent rooms** are designed with the captain on a
separate branch and swapped in when done (D17).

## 2. Money loops (D3, D14)
| Offer | What the city delivers | Red (captain or client) |
|---|---|---|
| **Done-for-you Kindle publishing** (Fiverr) | Edited manuscript, a cover proposed with image models, a KDP-ready package, setup guidance. See `workflows/kindle-done-for-you.md`. | The Fiverr listing, messages to buyers, the client's KDP account, publish button |
| **Client smart-sites** | A factory-built site for a local business, deployed to a private preview | Pricing, contact, go-live |
| **AI Employee** (Foundry) | A StarNet per client: their LLM wiki + Instinct in front, firstmate-style crew underneath. The client only talks to Instinct (WhatsApp Business first). No dashboards. | Pricing, the client's WhatsApp number, contracts |
| Freedom of Speech store | **Paused** | — |
Pricing and sales stay with the captain.

## 3. Autonomy (D4)
- **Green (no ask):** research, drafts, code on branches, PRs, private previews, internal reports.
- **Yellow (one tap; can queue overnight for the morning):** merges, deploys to client-visible previews, a paid model call within budget.
- **Red (always the captain):** money, pricing, contacting anyone, public publishing or go-live, deletion, anything irreversible.
Enforced in code (gateway policy), not in prompts.

## 4. Control (D5, D8)
- The captain talks to **Instinct**. Instinct and the command center write to **one gateway inbox**, so "merge it" from either one is the same act.
- The command center also runs Hermes, Pi and Bars. StarNet is one panel there.
- **Intake:** the captain and Instinct decide by voice, then Instinct adds a repo + instructions to the **factory intake queue**. Max 5/day;
  Heisenberg refuses the 6th.
- **Grill at intake (D9):** one grill session per repo over Instinct. Skipped questions take the architect's recommended answer, marked
  `ASSUMED`; work depending on an ASSUMED answer parks at yellow for the morning, and the rest proceeds.

## 5. Districts in v1 (Q15)
On: **command** (Heisenberg + the Instinct bridge), **production** (software factory), **security** (new 13th district: attack lab + exit
gate), **creative** (design, motion, covers), **revenue** (delivers the offers), **impact** (NW Kids jobs already approved).
Paused: **commerce**. Off until a money loop needs them: crypto-cuties, pauli, intelligence, experiment, financial, operations.

## 6. How Heisenberg runs the work (Q16)
- **Heisenberg = StarNet's foreman**, deterministic, on the VPS: queue, budgets, approvals, routing, the 5-minute tick, the result posting.
- **Code jobs → firstmate** (kunchenguid/firstmate, MIT) on the VPS: one visible worker per task, each in its own worktree, PRs out. Relay
  off (it posts publicly); tmux backend (Herdr is AGPL, skip it).
- **Non-code jobs → StarNet's mission desk.**
- Every worker loads a **persona** for its role from the persona library (D1).

## 7. Persona library (D1)
All **283** personas (326 Markdown files, of which 283 define a persona) from `msitarzewski/agency-agents` (MIT, pinned at b37b5bb) live in StarNet as **model-agnostic data**: role, mission,
rules, and district mapping. Any agent (Instinct, Heisenberg's crew, any model) can load one. Served read-only through the Dojo district,
with the same review and quarantine pass as the 371 skills; MIT attribution kept; upstream updates only through a reviewed upgrade.

## 8. The software factory (D10, D11, D13, Q17)
Pipeline per repo: intake → grill → PRD → **sandboxed build** (OpenSandbox) → tests → independent **review** → **security district attack
run** → **judge** → **deploy step** → live test on the VPS preview → report.
- **Three voices:** builder, judge and security auditor come from three different model families.
- **Exit bar** (all must pass):
  - every backend feature in the PRD works, with tests
  - the security district passes: G15 = two attack runs by a non-builder; HIGH and CRITICAL findings are never waivable
  - the design follows vibe-engineering's design workflow and scores **UDEC ≥ 8.5**
  - **the-extractor** finds no AI slop in copy or front-end design
  - deployed to a private VPS preview that opens on the phone
  - the judge says SHIP
- **Safe VPS access (the item 49 guard redesign, approved):** the builder only ever holds a read-only GitHub token and no server access. After
  SHIP + security PASS, a **separate deploy step** with its own **deploy-only credential** pushes to a **preview area** on the VPS (Coolify)
  and runs the live tests. No agent ever holds that credential directly. Going live publicly is red.

## 9. Models and spend (D7, D12, D15, Q20)
- **Default:** the newest DeepSeek on OpenRouter, re-resolved live at run time (2026-10-25: `deepseek/deepseek-v4.1-flash-1017`), with free
  models where they're good enough.
- **Opus only when the captain says so.**
- Personal subscriptions (ChatGPT/Grok/Kimi via the existing model switcher) only for sessions the captain drives; all unattended work runs on APIs.
- **Caps:** $20/month hard stop (halts everything) · $2/day alert to Instinct · $0.25 per mission unless Heisenberg asks · voice kill
  switch "Instinct, stop everything" · live spend board in the command center · a daily spend line in the Instinct report.

## 10. Client channel (architect decision, delegated)
Each AI-Employee client gets **Instinct on a WhatsApp Business number** (official Cloud API; the source kit in #36: inbound webhook with
`x-hub-signature-256`, durable message-id dedupe, owner/phone-number filter, default OFF). iMessage is a later add-on (no official API).

## 11. Non-negotiables
No secrets in files, chat or relay · no spend beyond the caps · no contacting people · no public publishing or deletion without the captain ·
three voices · ICM walk test everywhere · AI-time sizing.
