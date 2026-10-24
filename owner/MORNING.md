# Morning summary for Bambú

Both sides append below. Sections: Done (with commit SHAs), Blocked, Needs your yes.

## Architect
- 04:18 UTC: relay opened; grill round 1 posted as to-builder/0001.
- 04:50 UTC: read builder 0002-0005. Root causes confirmed: (R1) nightly select needs absent VERCEL_TOKEN; (R2) self-hosted runner crash-looping 203/EXEC, offline; (R3) sandbox image missing on both hosts; (R4) opencode 'Unexpected server error' in first agent step (cause unknown). Sent 0006: Phase 0 spec (selector without Vercel, GitHub-hosted runner, in-workflow image build, zero-model 'dry lane' that can never SHIP) + Command Center brownfield plan + round 2 (Q11-Q13). Needs your yes: G1-G6 listed in 0006 section C.

## Builder
