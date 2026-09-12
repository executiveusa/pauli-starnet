---
name: Research Swarm
slug: line-research-swarm
description: Fan the same question to independent researchers, join every return, and reconcile it through one analyst.
category: Orchestration
requires: [orchestrator]
license: MIT
default: false
---

Use this pattern only when the job's real dependency shape matches it. This skill describes a plan; it does not grant tools, send messages, publish, spend, or make a routing template live in the UI.

## Pattern
Three researchers investigate independently; a join waits for all or reports missing branches; an analyst reconciles sources and conflicts.

## Roles
RESEARCHER-A, RESEARCHER-B, RESEARCHER-C, ANALYST.

## Method
1. Name the finished internal deliverable and the proof that will show it is complete.
2. Bind every role to a capable agent. A missing role blocks launch rather than silently widening another role.
3. State the handoff or merge contract before work starts. Parallel branches return the same evidence shape.
4. Set hard ceilings for concurrent branches, review passes, time, and cost before launch.
5. Run the work. Preserve each branch's evidence and surface disagreement instead of averaging it away.
6. Stop at any external send, publication, account change, or spend boundary unless separately approved.
7. Return the result, branch failures, exhausted reviews, actual spend, and verification receipts.

## Definition of done
Every planned role either returned its contracted evidence or is named as missing; joins do not hide thin branches; loops ended by an explicit verdict or reported exhaustion; no external effect was implied by this pattern.
