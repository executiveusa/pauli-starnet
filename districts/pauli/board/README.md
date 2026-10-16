# Board mode (council board of advisors)

Board mode is part of the StarNet council, not a separate system. The 3-turn adversarial debate
(advocate -> critic -> judge) is unchanged; a board session is the opt-in parallel protocol in the
same module:

- N persona seats (2..8), each with an id, a model, a weight, and a brain folder (markdown).
- Seats speak in declared order; a seat sees the proposal plus only the statements before it
  (the council's information-asymmetry rule, generalized).
- Every seat casts one weighted vote (APPROVE / REJECT / MODIFY + one-line reason).
- The chair (never a seat model - judge independence) sees every statement plus the weighted
  tally and locks the section-3 ruling contract extended with statements, tally and the scored
  recommendation. `halt` escalates to the human, same as the debate.
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
