# Security audit law (G15) — StarNet factory contract

**Law.** No app ships without a security audit receipt for the exact commit being shipped. No receipt, or a stale one, is an automatic HOLD.

Ordered as law for vibe-engineering and the software factory by the owner on 2026-10-09. Source: the Oct 5 Nick Automates short "Free AI skill finds and fixes security holes in your vibe coded apps", demonstrating Cloudflare's MIT `security-audit` skill. The skill is registered in the pinned agent-skills registry (`pauli-agent-skills-2026` PR #5) and vendored into vibe-engineering (`factory/vendor/security-audit-skill/`, upstream commit `c1c8a8c1471069fb0e188eeaff69b8e8db6564a8`). The canonical law text lives in vibe-engineering at `factory/icm/template/shared/SECURITY_AUDIT_LAW.md`; the rules below are the same law, word for word, plus the StarNet factory contract.

## The six phases

All six are required, in order:

1. **RECON** — parallel agents map architecture, trust boundaries, and input surfaces.
2. **HUNT** — parallel agents attack: injection, access control, business logic, crypto, feature abuse, chained attacks, wildcard. AI apps also get prompt-injection hunted.
3. **VALIDATE** — a separate agent whose only job is to DISPROVE each finding. Only survivors count.
4. **REPORT** — human-readable report plus traces for MEDIUM and up, every issue with its fix.
5. **STRUCTURED OUTPUT** — `findings.json` that passes the schema validator.
6. **INDEPENDENT VERIFICATION** — fresh agents check every claim against the actual source.

## The rules

- **R1.** Only report what is exploitable. "Could theoretically" is not a finding.
- **R2.** Severity = likelihood x impact. A missing second layer when the first blocks it is a hardening note, not a vulnerability.
- **R3.** No self-audit. The auditor is never the builder, never the judge; the finder never validates.
- **R4.** One run catches about half. Every release gets at least 2 runs; the second run targets gaps.
- **R5.** Exact-SHA receipt. A mismatch is a HOLD; fail closed.
- **R6.** Pass = zero confirmed CRITICAL or HIGH findings. MEDIUM and above must be FIXED or WAIVED, and a waiver needs the owner's words, not agent judgment.
- **R7.** Nothing auto-fixes. The audit reports; the owner approves changes. No attacks on production; sandbox only.
- **R8.** Rejected findings stay in the record, with the reason.
- **R9.** Placement: after the storm drill, before final code review and the Judge.
- **R10.** Install check: the registered skill's `SKILL.md` must list the six phases.

## StarNet factory contract

- The builder never audits its own work. Audit crews are independent of build crews.
- The Judge only reads the receipt; it does not run or re-derive the audit.
- A mission cannot be marked done by the crew that built it — the audit receipt is part of done.
- Receipts feed the city: each building shows its audit state from `security-audit.json` receipts, not from crew claims.
- Existing apps (kupuri-monarch, Command Center) get audit-only runs first, non-blocking, until the owner says otherwise. New ships cannot go out without a pass.
