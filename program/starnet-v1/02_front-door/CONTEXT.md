# 02_front-door — one intent shape from every front door

One job: Instinct (and later the Command Center) sends `CreateMissionInput` to Terabithia and speaks only receipted answers.

## Inputs
- Working: executiveusa/instinct-voice-agent `instinct_vision_agent.py` (`dispatch_to_hermes`, ~line 101), `hands.py` (board, ~line 67)
- Reference: ../_shared/contracts.md §1 (intent), §5 (board)
- Reference: ../_shared/PRD.md §5 steps 1 and 7

## Process
1. Replace the Hermes payload with `CreateMissionInput`: post to `TERABITHIA_URL/api/v1/intents`, and set `preferred_agent: "starnet"` when the captain says "Heisenberg".
2. Speak `summary` + `receipt_id`. With no receipt, say so and claim nothing.
3. Point `INSTINCT_BOARD_URL` handling at the board shape in contracts §5. Keep the file fallback, labelled stale.
4. Tests: payload shape, no-receipt wording, board mapping. They must fail on the old code.

## Outputs
- output/EVIDENCE.md: PR link, test output (old code failing, new passing), and the env variable names the server needs.

## Human check
The captain reads the spoken-answer strings in the diff and confirms none can claim success without a receipt.
