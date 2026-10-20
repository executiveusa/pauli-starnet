# Board mode (council board of advisors)

Board mode is part of the StarNet council, not a separate system. The 3-turn adversarial debate
(advocate -> critic -> judge) is unchanged; a board session is the opt-in parallel protocol in the
same module:

- N persona seats (2..12), each with an id, a model, a weight, and a brain folder (markdown).
- BLIND-FIRST: in round 1 every seat locks its own position seeing only the proposal - no seat
  sees any other seat's take. In round 2 every seat sees all round-1 positions (never other
  round-2 arguments) and argues to its final vote.
- The tally counts final votes only; a round-1 vote that changed in the argument is not counted.
- The chair (never a seat model - judge independence) sees every statement from both rounds plus
  the final-vote tally, summarizes the debate, and locks the section-3 ruling contract extended
  with statements, rounds, tally and the scored recommendation. `halt` escalates to the human,
  same as the debate.
- Every seat runs on its own model, swappable per call with `--set seat=model` on the CLI (or by
  editing the manifest); every estimate, receipt and locked ruling lists the seat -> model map.
- Same ASTRA gate (deny-by-default mission grant with budget), same estimate-before-run pricing
  (unknown models refused, free models are $0 entries), same hashed receipts and minutes ledger.

## Run one

```
OPENROUTER_API_KEY=... node scripts/pauli-board.js \
  --proposal "launch the NW Kids channel plan" \
  --board districts/pauli/board/manifest.example.json \
  --mission msn-board-1 --budget 0.05 --grant-model qwen/qwen-2.5-72b-instruct:free
```

The estimate prints first; nothing runs until you re-run with `--yes`. Free-first: the example
manifest and `prices.free.json` use OpenRouter `:free` ids at $0 - verify current free ids at
openrouter.ai/models before editing. Real persona brains replace `seats/*.example.md` (a brain is
a markdown folder of source material; the seat answers from it, in its voice).

## Execution skills (after the ruling)

`skills/registry.json` lists distilled, per-claim-cited skills from the seat canons (Seth: 20-book
KB; Hormozi: mozi-sales + CLOSER transcripts). Method: book-to-skill (MIT,
github.com/virgiliojr94/book-to-skill) - distilled guidance and citations only, private source
material never lands in git. When a ruling locks, the execution receipt gains a `skills` block:
the chair may name skill ids in its contract JSON (`"skills": ["seth/shipping-and-courage"]`,
unknown ids dropped), otherwise a deterministic keyword matcher ranks the registry against the
proposal + recommendation. Receipts stay the audit: who picked what is logged before hashing.
