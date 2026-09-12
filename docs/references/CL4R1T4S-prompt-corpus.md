# Reference: CL4R1T4S coding-agent system-prompt corpus

[elder-plinius/CL4R1T4S](https://github.com/elder-plinius/CL4R1T4S) is a
corpus of leaked/extracted system prompts from production coding agents
(Cursor, Replit, Devin, Windsurf and others).

Adopted 2026-09-12 as a **reference library only** for writing StarNet worker
prompts: how production agents structure tool-use contracts, refusal
boundaries, planning loops and evidence requirements. When a worker prompt is
revised, diff it against the closest CL4R1T4S exemplar and borrow structure,
not text.

Not adopted: anything offensive. This sits next to the defensive harness in
pauli-hermes-agent (`agent/policy/`), which uses adversarial prompt corpora
strictly as attack fixtures to prove our gates hold.
