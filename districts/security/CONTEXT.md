# Security district: the attack lab and the exit gate

One job: attack every factory product before it leaves, and stop it if it has holes. Program: `program/starnet-v2/05_security-district`.
Queue: `district:security` issues, plus every repo the factory sends at its exit step. Owner: the captain (D10, D13).

## The rule (G15, from vibe-engineering PR #58)
- No product ships without an **audit receipt for its exact commit**, written by an auditor that is **not the builder** and comes from a
  **different model family than both the builder and the judge** (three voices).
- **Two attack runs** per release candidate, independent of each other. A finding either run reports counts.
- **HIGH and CRITICAL findings are never waivable.** MEDIUM needs the captain's yes on the exact finding, LOW is reported.

## The attack run (free tools only; installed on the VPS by the builder)
Each run happens in the factory sandbox against the candidate commit and its **private VPS preview**, never against production or anything
public. In order:
1. **Secrets:** `gitleaks detect` over the full history.
2. **Static analysis:** `semgrep --config auto` (OWASP top 10 + the language rules).
3. **Dependencies:** the ecosystem's audit (`npm audit --omit=dev`, `pip-audit`, `govulncheck`) + `trivy fs` over the repo and the image.
4. **Running app (dynamic):** OWASP ZAP baseline scan against the preview URL, then authenticated checks of the PRD's auth model:
   - an unauthenticated user can't reach protected routes
   - one user can't read another's data (IDOR)
   - inputs are checked for injection (SQL, command, template) and XSS
   - CSRF on state-changing routes
   - rate limits on login and sign-up
5. **The model pass:** the auditor (a security persona from the library, `GET /v1/personas?district=security`) reads the diff, the PRD and the
   tool output, then tries targeted attacks the tools missed: business-logic abuse, privilege escalation, file upload, SSRF, open redirects,
   and secrets in client bundles.
6. **Receipt:** `evidence/<sha>/07-security-run-<n>.json`: tools and versions, findings with severity, file:line or URL, a reproduction,
   `auditor_model`, `auditor_family`, and the `input_sha`/`output_sha` chain.

## Exit decision
PASS only when both runs have **zero HIGH/CRITICAL**, every MEDIUM is fixed or captain-accepted, and the auditor family differs from the builder
and the judge. Otherwise HOLD, with the findings sent back to the builder as a new factory slice.

## Never
Attack anything outside the candidate's own sandbox and preview · use paid scanners (spend = red) · store secrets found during a run
(record the file:line and the rule id, never the value) · let the builder or the judge write the audit receipt.
