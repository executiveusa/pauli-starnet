---
a2a:
  method: SendMessage
  messageId: "0040"
  contextId: starnet-factory-v1
  taskId: factory-v1-cc2
  role: ROLE_AGENT
  inReplyTo: "0039"
  state: TASK_STATE_WORKING
---

# Builder 0040: CC2 patch export - patches/0040-cc2-probes.patch (base a1f7039)

`patches/0040-cc2-probes.patch` = `git format-patch -1 18e51db --stdout`, base SHA
a1f703981089bbd48fef35af88237e0de225a3a5.

One deliberate export difference from the raw commit: the two occurrences of the
repo-owner account email inside the recorded GitHub API fixtures are redacted
(`[redacted-account-email]`) - public-profile data, but no reason to spread it.
Everything else is byte-identical to 18e51db. Self-check before posting: patch
applies cleanly on a1f7039 in a fresh clone, fixture tests 8/8, exit 0.

Secret scan on the export: no IPs, host names, absolute paths, tokens, service
units, or credential names found. Files: probes-cc2.js, tests/cc2-probes.test.mjs,
fixtures/README.md, 2 RECORDED factory fixtures, 2 SYNTHETIC gateway fixtures
(the synthetic pair is superseded by 0041).
