/* sidecar/pauli-canon-sync.js — sync starnet's bundled skill library into the Hall of Canon
   registry (chunk 6, follow-on of the paperclip port).

   The bundled skill library (sidecar/skills/library/*.md, loaded through sidecar/skills/catalog.js)
   is starnet's curated know-how. Until now it lived OUTSIDE the canon registry: no provenance, no
   review state, no license hold. This sync closes that gap - every bundled skill becomes a
   registry entry of kind 'skill' with REQUIRED provenance:
     source    = the repo that ships it (default executiveusa/pauli-starnet)
     sourceSha = the repo SHA the sync ran against (injected - never guessed)
     license   = the skill's OWN frontmatter license field when it has one, else the repo license
   so a skill carrying a stricter license than the repo keeps it (license law travels with the entry).

   IDEMPOTENT: a re-sync at the same sourceSha with the same license changes nothing (no version
   churn). A sync at a NEW sourceSha supersedes - the registry bumps version and keeps the full
   provenance history, so the chain of custody tracks the repo.

   Fail-open per skill: one malformed or refused entry lands in the report's failed list and never
   stops the rest. All ambient I/O INJECTED (fs, pathMod, clock, crypto, catalog). No Date.now.

   makePauliCanonSync({ fs, pathMod, clock, crypto, catalog })
     syncBundledSkills({ registry, dir, repoSha, source?, defaultLicense? })
       -> { ok, report: { total, added, updated, unchanged, failed, skills } } */
'use strict';

function makePauliCanonSync(deps) {
  const fs = deps.fs, pathMod = deps.pathMod, clock = deps.clock, crypto = deps.crypto, catalog = deps.catalog;
  if (!fs || !pathMod || typeof clock !== 'function' || !crypto || !catalog || typeof catalog.loadDir !== 'function') {
    throw new Error('pauli-canon-sync: fs, pathMod, clock, crypto, catalog (with loadDir) are required');
  }
  const ok = extra => Object.assign({ ok: true }, extra || {});
  const bad = (error, msg) => ({ ok: false, error, msg: msg || error });

  function syncBundledSkills({ registry, dir, repoSha, source, defaultLicense }) {
    if (!registry || typeof registry.register !== 'function' || typeof registry.get !== 'function') {
      return bad('no-registry', 'a pauli-registry instance is required');
    }
    if (typeof dir !== 'string' || !dir.trim()) return bad('no-dir', 'library dir required');
    if (typeof repoSha !== 'string' || !repoSha.trim()) return bad('no-sha', 'repo SHA required - provenance is never guessed');
    const src = source || 'executiveusa/pauli-starnet';
    const repoLicense = defaultLicense || 'MIT';
    const skills = catalog.loadDir(dir, fs, pathMod);
    const report = { total: skills.length, added: 0, updated: 0, unchanged: 0, failed: [], skills: [] };

    for (const skill of skills) {
      const license = skill.license || repoLicense; // the skill's own license wins (license law travels)
      const prior = registry.get('skill', skill.slug);
      if (prior.ok && prior.entry.provenance.sourceSha === repoSha && prior.entry.provenance.license === license) {
        report.unchanged++;
        report.skills.push({ slug: skill.slug, action: 'unchanged' });
        continue;
      }
      const reg = registry.register({
        kind: 'skill',
        name: skill.slug,
        source: src,
        sourceSha: repoSha,
        license,
        meta: {
          name: skill.name,
          description: skill.description,
          category: skill.category,
          requires: skill.requires,
          default: skill.default,
          syncedAt: clock()
        }
      });
      if (!reg.ok) { report.failed.push({ slug: skill.slug, error: reg.error }); continue; }
      const action = prior.ok ? 'updated' : 'added';
      report[action]++;
      report.skills.push({ slug: skill.slug, action, version: reg.entry.version, licenseHold: reg.entry.licenseHold });
    }
    return ok({ report });
  }

  return { syncBundledSkills };
}

module.exports = { makePauliCanonSync };
