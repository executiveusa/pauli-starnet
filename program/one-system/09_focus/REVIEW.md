# Review: Instinct, Bambú and the ecosystem (Oct 15 – Nov 17, 2026)

Sources, measured on 2026-11-17: the full WhatsApp export with Instinct (7,501 messages), GitHub (all executiveusa
repositories and pull requests), Instinct's own server inventory of 2026-11-06, and the code of the core repositories
(READMEs were not trusted). Numbers come from scripts, not estimates. Where a number is a pattern count (a keyword
search), it says so.

## The verdict in one paragraph

The machine works hard and ships almost nothing that earns money. In 34 days you and Instinct exchanged 7,501
messages, the account opened 1,803 pull requests and merged 226, and the record shows no signed client and no paid
invoice from MACS or Kupuri. The cause isn't one bad model or one bad habit. It's a loop: you open new fronts faster
than anything closes, Instinct acts as a technician that waits for the next order instead of a chief that owns a
result, and both of you pay for it in approvals, broken credentials and half-finished work. The fix is fewer things,
one owner, measured weekly in money.

## What the data shows

| Measure | Value |
|---|---|
| Messages, 34 days | 7,501 (you 2,795, Instinct 4,706); 220 a day |
| Instinct's words | 371,952 (79 per message on average) |
| Your long pasted prompts (300+ words) | 102, covering about 25 different projects |
| Your messages with a link | 366 (195 of them social video links) |
| Your replies of 1–3 words | 895 |
| Instinct messages asking for your approval or a choice* | 1,044; 423 of them numbered option menus |
| Instinct messages about credentials, tokens or sign-ins* | 1,041 |
| Status lines | 849 YELLOW, 506 GREEN, 151 RED |
| Causes of RED* | builds and tests 97, credentials 70, outages 30, billing and quota 30, disk 17 |
| Repositories | 582 (362 originals + 220 forks); 12 Synthia, 9 Posta, 4 agent-city copies |
| Pull requests since Oct 15 | 1,803 opened, 226 merged (12.5%); 1,704 open account-wide |
| 13 core repos | about 380 branches and 125 open pull requests |
| Servers, Nov 6 | 98 containers + 41 host services; 22 failed, dead or restart-looping; disks 93% and 81% |
| Business records (Instinct's Nov 12 check) | Tila: 20 leads, 0 clients; Buffer Blaster: 0 campaigns; PostaTees: 2 client rows, 0 content |
| Closed deals or paid client invoices in the chat | none found |

\* keyword counts over message text; a message can count in more than one row.

What the topics say: content tooling, servers and credentials got the most attention every week. Offers and sales
(Found First, MACS, Kupuri) were about 13% of topic mentions, and client work about 11%.

## Positives (keep these)

1. **Honesty under pressure.** Instinct marks what's unverified, refuses to fake results, and says "not finished"
   when it isn't. That's rare and worth more than speed.
2. **Safety instincts.** It stopped before publishing private photos, held deletions for your approval, kept a live
   database it was about to remove, and contained the October breach fast (Actions disabled on 191 repos, tokens
   revoked, runners stopped).
3. **Real assets exist.** StarNet with Paperclip, the factory and judges; an 821-document knowledge library; the
   13-seat council corpus; Hermes, Pi and BARS running; Genfeed, TryPost and Parallax deployed; Motion Master as a
   plugin; the Command Center. The parts for a working agency are already built.
4. **Evidence culture.** Checksums, independent reviewers, receipts. The habit is right; it's pointed at the wrong
   targets (infrastructure instead of revenue).

## Your failure patterns (owner)

1. **Too many fronts.** About 25 projects in a month, many restarted with a "FINAL" or "MASTER" directive. A new link
   arrives mid-task 366 times. Nothing closes because something new always outranks it.
2. **Too many bosses.** Orders arrive from you, from ChatGPT "management", from Claude/Opus handoffs and A2A relays.
   Instinct becomes a relay between AIs instead of a chief, and conflicting instructions cost days.
3. **No done-means.** "All of them", "everything", "figure it out". Without a measurable finish line, Instinct fills
   the gap with process, and you ask for the same prompt again (46 times you asked for a prompt).
4. **Inconsistent delegation.** "Stop asking me" sits next to strict approval rules. Result: 1,044 approval requests
   and 895 one-word replies. That's approval fatigue, and approval fatigue is how a tired "yes" approves something
   destructive.
5. **Credentials everywhere.** Keys live in Infisical, the Instinct vault, laptops, repositories and a public
   repository named `pauli-sercets-vault-`. Every expired key becomes a RED and a question to you.
6. **Infrastructure over income.** The work that feels productive (agents, cities, 3D, dashboards) crowds out the
   work that pays (prospects, calls, proposals, delivery).
7. **Side projects without a lane.** Boxing, books, coffee notes and friends' sites take the chief's time because
   nothing says where they belong or what they're worth.

## Instinct's failure patterns (model)

1. **Technician, not chief.** In its own words (Nov 16): "I've been acting like a technician waiting for the next
   task instead of owning the business result." It presents menus (423) instead of deciding inside its delegation.
2. **Status instead of outcomes.** 849 YELLOW updates averaging 79 words. Progress is reported per task, never
   against a business number.
3. **Technical pass ≠ brief pass.** "Moving stills" delivered as animation, waves that don't move, mobile sizes still
   wrong after "verified". Checks prove the build runs, not that it does what you asked.
4. **No credential ownership.** No register, no rotation calendar, no expiry alerts. The same Google sign-in prompt
   comes back repeatedly; Jarvis's OpenRouter key expired silently; the repo OpenRouter key is rejected today.
5. **Starts before it finishes.** 1,704 open PRs, 153 stale to-dos it cancelled in one sweep, about 25 silent
   "zombie" agents, 22 failed services. It doesn't have a work-in-progress limit.
6. **Broad access plus automation.** The breach worked because GitHub tokens with wide access sat next to automated
   jobs that could read secrets.
7. **Memory by chat.** Lists, prompts and decisions live in the WhatsApp scroll, so they're lost and re-requested.

## Black swans (low odds, high cost)

1. **The breach is "contained, not cleared"** (Instinct, Oct 26). Data left one server; persistence on the servers
   wasn't ruled out. Client data (Tila) sits on the same boxes. Only a rebuild from known-clean code proves it clean.
2. **A public repository named `pauli-sercets-vault-`** (1.4 GB fork), previously reported to contain exposed keys.
   Anything in it should be treated as stolen: make it private or delete it, and rotate every key it ever held.
3. **Disk at 93% on one server.** One log burst takes down every app on that box at once.
4. **Single point of command.** Instinct runs on an outside platform. If it stops, Heisenberg takes over, but
   Heisenberg runs on the same servers that may be compromised.
5. **Subscription and terms risk.** Bots on your Claude subscription (CI token, laptop MausBot) are capped and may
   breach terms if used as a shared service. Rate limits can stop reviews at the worst moment.
6. **Silent bills.** Unexplained Vercel billing (Oct 22), declined Hostinger charges (Nov 3), RunPod volumes. No one
   owns a monthly spend check against the $100 cap.
7. **Approval fatigue.** A thousand "reply yes" messages train a reflex. The day it approves a delete or a payment
   by mistake is the day it costs real money.

## The fix

### 1. One machine, five rules (organization)

1. **Three active projects, maximum.** MACS (Found First, English), Kupuri (Spanish), and one side slot. Anything
   new waits in a backlog until one of the three closes. Instinct enforces it and tells you which one would be paused.
2. **One boss.** You talk to Instinct. Other AIs advise through you; their output is input, never orders.
3. **Every job has done-means and a number.** No job starts without a measurable finish line.
4. **A delegation table, not per-step approvals.** Instinct acts without asking inside the table (reversible work,
   spend under $10, research, drafts, restarts). It asks only for the owner gates (money over the limit, sending
   messages, publishing, deleting, production releases), and batches those into two approval windows a day.
5. **One scoreboard, weekly, in money.** Prospects found → audits approved → calls booked → proposals sent → closed →
   cash collected. Infrastructure work is justified only by moving one of those numbers.

### 2. Core stack (registry/core-stack.json)

| System | Role | Server | Decision |
|---|---|---|---|
| StarNet + Paperclip | headquarters, the one queue, judges | prod-city-1 | keep; finish activation (FINISH-GATES) |
| Coolify | deploy control for both servers | prod-city-1 | keep one; retire the duplicate on srv1099662 after migration |
| Supabase | shared data | prod-city-1 | keep one; migrate srv1099662's copy |
| Hermes | agent runtime, Instinct's fallback line | prod-city-1 | keep |
| Pi | your private personal/financial agent | prod-city-1 | keep; never agency work |
| BARS/TARS | voice and demo front door | prod-city-1 | keep; not a manager |
| Terabithia | private relay between StarNet, the factory and laptops | prod-city-1 | keep; that's its place |
| TryPost | social scheduling (owner approves each post) | prod-city-1 | keep; its app container is stopped, restart it |
| Parallax | private image studio | prod-city-1 | keep; supplies artwork |
| Genfeed | content generation | srv1099662 | keep |
| Motion Master | animation skills plugin for Claude/Codex | not a server app | keep as a plugin |
| MausBots | research and site audits on their own computers | OpenMausBot computers | keep; Nick's Stack via Hermes, no Orgo |
| Command Center | phone control | Vercel (server copy as fallback) | keep |
| Cloudroom, T3 Code | coding tools | laptop | park until a job needs them |
| Montage, factory/foundry, Jarvis, previews, fallbacks | experiments and copies | both | park or retire per the prune plan |

From the Nov 6 inventory, after the owner's client-site decisions of Nov 17, the prune plan keeps 45 core items and
7 undecided client items, stops 46 parked and 72 retired items, and leaves 15 for migration (12 duplicates and 3 sites
moving to Vercel): about 60% fewer running things. Nothing is deleted without a 7-day
wait and your approval. See `scripts/one-system/prune-plan.mjs`.

### 3. Repositories

Archive (read-only, not deleted) every repo with no push in 30 days that isn't in the core stack or a client's live
site, after confirming it isn't deployed. Close or merge every PR older than 14 days: merge if green and still
wanted, otherwise close with a one-line reason. Keep one Synthia and one Posta repo; archive the rest.

### 4. Offers and customer service (the King Doe lens, from the Chris Do corpus)

- **Discovery before pitch.** Every first call runs the Story Sells grid (past, present, future × want, obstacle,
  insight). The bots prepare the grid from the audit; you run the call.
- **Sell the outcome.** Found First is "you get found first and get the call", not "a website and SEO".
- **Value pricing with proof.** Price from the outcome and its worth; the $497 pilot for the first three buys the
  proof (before/after numbers, a testimonial, screenshots) that closes the next ten at full price.
- **All objections first.** The call script lists every objection before answering any.
- **PVP filter.** Take clients that score high on fulfillment, value and profit. Say no to the rest.
- **Service = heard, seen, understood.** Reply within one business day, a weekly one-screen outcome report per
  client (calls, leads, rankings, what changed), and a captured before/after for every job. These become standing
  jobs, judged like any other work.

### 5. MausBots get real jobs (added to the intelligence district, owner-approved)

- Weekdays: audit the day's 5 newest prospect sites as a buyer would (mobile, offer, contact path, speed) and attach
  the 3 biggest sale-losing issues to each prospect's scorecard. This feeds Found First directly.
- Weekly: audit macsdigitalmedia.com and the Kupuri site as a buyer would.
- Read-only, no messages, no purchases. Each MausBot runs Nick's Stack without Orgo: the template's Hermes
  `config.yaml`, `SOUL.md`, skills and `onboard.sh` installed directly on its own computer.

### 6. Security, before go-live

1. Make `pauli-sercets-vault-` private or delete it; rotate every key it ever held.
2. One credential register (where each key lives, its owner, its expiry), one vault, rotation dates, and an alert 7
   days before any key expires.
3. Narrow GitHub tokens: one fine-grained token per job, per repository, with an expiry. No token beside automated
   jobs that run untrusted code.
4. Rebuild headquarters from clean code during the go-live (fresh checkout per HANDOFF), and move client data only
   after a scan. Treat the old boxes as untrusted until they're rebuilt.

## Measured targets for the next 30 days

| Metric | Target | Source |
|---|---|---|
| Found First pilots closed | 3 | Stripe |
| Cash collected | ≥ $1,491 (3 × $497) | Stripe |
| Prospects scored and audited | 100 | Paperclip missions + scorecards |
| Discovery calls held | 15 | calendar |
| Active projects | ≤ 3 | Instinct's weekly report |
| Open PRs in core repos | ≤ 30 (from 125) | GitHub |
| Running containers + services | ≤ 80 (from 139) | prune plan |
| Approval requests to you | ≤ 2 batched windows a day | Command Center |
| Monthly AI and hosting spend | ≤ $100 | receipts + bills |

## Owner decisions, 2026-11-17
1. `pauli-sercets-vault-` becomes private; every key it held is rotated.
2. Rebuild or prune headquarters: explained first, decision pending.
3. Third project slot: Ground Work, the owner's personal offer for nonprofits (`program/ground-work/`).
4. Client sites: Tila promoted to core with `tila-scout` (`program/tila/`); Kitchen Creations and Breathe frontends only
   on Vercel; Coach Tyrone static frontend only; PostaStudios and the Ray review apps removed for space.
5. Independent PR reviews run on a free OpenRouter model for now; upgrade later (`docs/DECISIONS.md`, "Free reviewer").
