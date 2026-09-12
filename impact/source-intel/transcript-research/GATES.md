# Gates: StarNet source intelligence transcript collection

OWNS: transcript-research/**

Scope: collect the maximum verifiable transcript library for the latest videos from the two specified YouTube channels and document every limitation

- [x] G1: the coverage ledger contains 40 unique newest-first entries per channel, or records a precise discovery gap
  CHECK: node scripts/verify.mjs
  EXPECT: TRANSCRIPT_LIBRARY_VERIFIED
  EVIDENCE: automatic-evidence=v1; definition-sha256=307146bac2c3c230fa130c614fdbbb1b5c4a50fff87f9b99ec2c00f48975dddf; exit=0; EXPECT=matched; output-sha256=5e40995b3f733b7d71176f69d5d7f0707e66b846a21036b25387f7d45b8a466a; output-bytes=28; shell=/bin/sh; cwd=/workspace/scratch/b19991baf2e5/transcript-research; path=c9100c011bc4/13 entries

- [x] G2: every ledger entry records source URL, video id, title, duration, publication information, transcript status, and transcript provenance
  CHECK: node scripts/verify.mjs
  EXPECT: TRANSCRIPT_LIBRARY_VERIFIED
  EVIDENCE: automatic-evidence=v1; definition-sha256=307146bac2c3c230fa130c614fdbbb1b5c4a50fff87f9b99ec2c00f48975dddf; exit=0; EXPECT=matched; output-sha256=5e40995b3f733b7d71176f69d5d7f0707e66b846a21036b25387f7d45b8a466a; output-bytes=28; shell=/bin/sh; cwd=/workspace/scratch/b19991baf2e5/transcript-research; path=c9100c011bc4/13 entries

- [x] G3: every claimed transcript has saved text, and unavailable or invalid timestamp data is labeled instead of inferred
  CHECK: node scripts/verify.mjs
  EXPECT: TRANSCRIPT_LIBRARY_VERIFIED
  EVIDENCE: automatic-evidence=v1; definition-sha256=307146bac2c3c230fa130c614fdbbb1b5c4a50fff87f9b99ec2c00f48975dddf; exit=0; EXPECT=matched; output-sha256=5e40995b3f733b7d71176f69d5d7f0707e66b846a21036b25387f7d45b8a466a; output-bytes=28; shell=/bin/sh; cwd=/workspace/scratch/b19991baf2e5/transcript-research; path=c9100c011bc4/13 entries

- [x] G4: the report reconciles retrieved, unavailable, failed-integrity, and pending counts against the ledger
  CHECK: node scripts/verify.mjs
  EXPECT: TRANSCRIPT_LIBRARY_VERIFIED
  EVIDENCE: automatic-evidence=v1; definition-sha256=307146bac2c3c230fa130c614fdbbb1b5c4a50fff87f9b99ec2c00f48975dddf; exit=0; EXPECT=matched; output-sha256=5e40995b3f733b7d71176f69d5d7f0707e66b846a21036b25387f7d45b8a466a; output-bytes=28; shell=/bin/sh; cwd=/workspace/scratch/b19991baf2e5/transcript-research; path=c9100c011bc4/13 entries

