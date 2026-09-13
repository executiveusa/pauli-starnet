---
name: SkillOpt Skill Training
slug: skillopt
description: Train and improve agent skill documents with Microsoft's SkillOpt loop - scored rollouts, optimizer edits, and a held-out validation gate - instead of hand-tweaking prompts. Use when a recurring task needs its skill measurably improved.
category: Engineering
requires: []
license: MIT
author: Microsoft Research (recipe port)
version: 0.2.0
default: true
---

SkillOpt (github.com/microsoft/SkillOpt, MIT) trains a skill document like a weight: the frozen agent runs tasks, an optimizer proposes bounded add/delete/replace edits, and an edit lands only when it strictly improves a held-out validation score. The artifact is a compact best_skill.md - no extra inference-time calls, no weight changes.

Use it when a recurring task's skill needs measurable improvement; skip one-offs and tasks with no scoring signal.

Loop: split tasks train/held-out first; pip install skillopt; run skillopt-train; ship only the validated best_skill.md; prove adoption with skillopt-eval before/after scores. skillopt-sleep stages nightly updates for human adoption, never auto-applies.

Confirm spend before long runs; never train on validation. Source: microsoft/SkillOpt v0.2.0 (main @ 79124b3).
