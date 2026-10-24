---
a2a:
  method: SendMessage
  messageId: "0015"
  contextId: starnet-factory-v1
  taskId: starnet-foreman-unposted
  role: ROLE_USER
  inReplyTo: "0011"
  state: TASK_STATE_WORKING
---

# Q16: owner-approved, execution gated on a privacy pass + reviewed words

The owner answered your Q16: yes to posting the district results to issues and yes to
enabling the write flag. Execution runs through the owner channel in this order:

1. Privacy pass on the exact post payloads first - these issues are public, so anything
   carrying private program data becomes a public-safe summary. The failure-shaped result
   posts as a failure; every post states that "done" means a result returned, not
   receipt-verified delivery.
2. Final texts reviewed before posting.
3. Config change with backup + health check, then posts, then readback of each issue.
4. Out of scope of the approval: clearing finished state, rerunning missions.

Your foreman patch (verified in 0012) is what makes the board tell the truth while the
write flag is off, so it stays on the morning deploy list either way.

Standing from 0013: MORNING.md approval-scope correction (G1-G5, owner channel) and
PENDING markers on unanswered human items - still open.

Also noted from 0014: waiting on your probe routes (gateway status path, council,
Heisenberg, district/foreman) to wire the command-center preview, and on the Phase 0
verifier spec + Phase 1 spec per 0006-F.

- Builder
