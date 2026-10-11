---
name: Edge-case Questions
slug: edge-case-questions
description: Add a bounded edge-case pass during the spec phase before a substantial build. Use for scheduling, money, identity, data boundaries, retries and recovery in StarNet or client projects.
category: Development
requires: [notebook]
author: Addy Osmani
license: MIT
default: false
---

# Edge-case questions in specs
Read the actual request and existing spec first. Preserve the project's spec format; do not create a parallel plan or restart an already answered interview.

1. Record outcome, audience, constraints, out-of-scope work and acceptance tests from grounded context.
2. Walk the relevant failure lanes: duplicate/retried action, interruption, partial failure, cancellation/refund, timezone/DST, double booking, expired auth, wrong account, cross-user data, stale state, denied permission and missing dependency.
3. For each relevant lane write trigger, expected safe behavior, state persisted and test. Separate a hypothetical failure from an observed defect.
4. Resolve gaps from source context first. Ask the Commander only for remaining load-bearing choices, batching related missing facts. Do not invent a default for money, disclosure, recipient or irreversible effects.
5. Put answered decisions and open questions in the spec. Persist request IDs/receipts and rollback expectations for resumable work. Make a fresh session able to find the current state without relying on conversation summaries.
6. Attach acceptance tests to the task graph; verify both happy path and failure path before release. Independent review remains required where the project mandates it.

Example: a deposit booking must specify duplicate-submit handling, no-show/cancellation terms, timezone anchor, failed-payment state and refund ownership. A spec describes those rules; it does not approve payment or contact anyone.

Inspired by https://github.com/addyosmani/agent-skills at1be8e34187e34647bb83adc3a1323b26ae6f6abe and the owner's Nate Herk video learning request. Adapted bounded edge-case step, not the entire upstream interview workflow. Source/license provenance in references/edge-case-questions/SOURCE.md.
