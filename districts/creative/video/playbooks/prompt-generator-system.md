# Playbook: the prompt-generator system (node llm-as-prompt-engineer)

Rule: an agent never hand-writes a video prompt from scratch.

1. LOAD: paste the target model's official guide into ChatGPT/Claude (his reference: 38-page Seedance 2.5 guide) plus the relevant nodes from `knowledge/metricsmule-knowledge-graph.json`.
2. ASK: "build me a reusable prompt generator for <model> that handles story, shot structure, camera angles, and movement automatically."
3. GENERATE the scene prompts from the generator, in the model's structure (see seedance-structure.md / model-formulas.md).
4. UPGRADE: standing follow-up - "V2 cinematic upgrade with more advanced Hollywood-level camera direction." Compare against v1; keep the winner.
5. LOG: which generator version produced which render. Gauntlet failures feed back into the generator's rules.

Evidence: 9poJVwhCTOU, tC9Gg5RgB8Q, mL-sC5uidH8, 2sf35caY1qI (verbatim in graph).
