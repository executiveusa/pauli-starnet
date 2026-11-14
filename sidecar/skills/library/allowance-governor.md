---
name: Allowance Governor
slug: allowance-governor
description: Token-saving behaviors for agents on metered model allowances — model selection, reasoning effort, task shaping, and 5-hour/weekly window pacing — so the fleet never burns the allowance on work a cheaper lane could do.
category: Operations
requires: []
license: MIT
default: false
---

The allowance is a fuel tank, not a mood. Every agent decision either stretches it or burns it. This skill is the governor: the default behaviors every StarNet agent applies before spending tokens, so expensive lanes are reserved for work that actually needs them.

## The four levers

### 1. Model selection — right-size the lane, every time
- Classify the task BEFORE picking a model: lookup/extraction/triage/formatting = light lane; drafting, coding, analysis with a clear spec = mid lane; novel architecture, ambiguous judgment, multi-system debugging, anything irreversible = heavy lane.
- Never let the heavy lane do retrieval. If the answer is in a file, a DB, or a search result, the expensive part is finding it, not reading it. Search cheap, read cheap, escalate only the judgment call.
- When unsure between two lanes, start light with a tight scope and a clear escalation trigger ("if X isn't resolved in one pass, escalate"). Escalating up costs less than discovering you never needed the heavy lane.
- Subagents and fan-out workers default to the light lane unless the parent explicitly says why they need more.

### 2. Reasoning effort — think in proportion to the stakes
- Mechanical steps (tool help, file reads, routine navigation, known-shape edits) get minimal reasoning. Deliberation is for load-bearing decisions: what to send, whether it is safe, which result is right.
- One good plan beats five nervous re-checks. Plan the whole batch of work once, then execute without re-deriving decisions already made.
- Set an effort budget per task up front. A 2-minute triage that thinks for 10 minutes is a governor failure even if the answer is right.

### 3. Task shaping — the cheapest tokens are the ones never sent
- Batch: collapse independent reads, searches, and help pages into one call instead of one-per-turn. Every extra turn re-pays the full context cost.
- Fetch narrow: project only the fields you need, peek before opening full content, extract instead of dumping. Context you pull in is context you pay for on every later turn.
- Carry results forward: write durable identifiers and findings into the run record instead of re-fetching. Re-fetching the same fact twice is double spend for zero value.
- Trim the prompt's tail: delegate with only the context the worker cannot get itself. Fat delegations multiply cost across every agent that touches them.
- Stop when done. No summary loops, no courtesy passes, no re-reading output you already trust.

### 4. Window pacing — the 5-hour and weekly windows are a budget with a clock
- Know the window: metered allowances reset on rolling windows (a short ~5-hour window and a longer weekly window). Treat the short window as sprint fuel and the weekly as the strategic reserve.
- Front-load planning, not execution: heavy-lane work lands early in a window so light-lane follow-through can finish the job if the heavy allowance runs dry.
- Defer, don't strand: when the short window is nearly spent, park resumable work with a written resume point instead of pushing until a hard cutoff strands it mid-write.
- Smooth the fleet: a dispatcher that fires ten heavy tasks at once burns the window in one burst and idles for hours. Queue heavy work, run light work in the gaps.
- Track burn rate per window and report it: a mission that cannot name its token cost cannot be governed.

## Defaults when no other instruction applies
- Light lane for read-only, retrieval, triage, and formatting. Mid lane for bounded writes with a spec. Heavy lane only for judgment that is load-bearing or irreversible.
- Every paid or metered call gets a one-line cost note in the run record (what lane, roughly what it cost, why that lane).
- If a cheaper lane produced the same result twice in a row, demote the default lane for that task shape permanently and note it.

## Anti-patterns (governor violations)
- Heavy-lane model reading a whole file to answer a one-field question.
- Re-fetching context that was already in the transcript or run record.
- One tool call per turn when five independent calls could batch.
- Escalating reasoning effort because a task feels important, not because its decisions are load-bearing.
- Starting heavy work in the last stretch of a window with no resume point.

*Pairs with the Cost Audit skill for after-the-fact accounting; this skill is the before-and-during governor.*
