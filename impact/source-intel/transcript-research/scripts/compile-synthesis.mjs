import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const groups = [
  ['Cause Specialist', 'cause-specialist'],
  ['Monica Main', 'monica-main'],
];
const records = groups.flatMap(([channel, slug]) => fs.readdirSync(path.join(root, 'intelligence', slug)).filter(name => name.endsWith('.json')).sort().map(name => ({
  channel,
  ...JSON.parse(fs.readFileSync(path.join(root, 'intelligence', slug, name), 'utf8')),
})));
const clean = value => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
const frequency = (items) => {
  const counts = new Map();
  for (const item of items) {
    for (const word of String(item).toLowerCase().match(/[a-z]{5,}/g) || []) counts.set(word, (counts.get(word) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
};
const lines = [
  '# StarNet nonprofit source-intelligence synthesis',
  '',
  'This synthesis is compiled from ' + records.length + ' per-video intelligence records. Each record links back to its source video and its saved transcript.',
  '',
  '## Repeated themes by channel',
  '',
];
for (const [channel] of groups) {
  const rows = records.filter(record => record.channel === channel);
  lines.push('### ' + channel, '', 'Records: ' + rows.length, '', 'Frequent source terms: ' + frequency(rows.flatMap(row => row.major_ideas)).map(([word, count]) => word + ' (' + count + ')').join(', '), '');
  lines.push('Representative ideas:', '');
  for (const row of rows.slice(0, 10)) lines.push('- ' + (row.major_ideas?.[0] || 'No major idea returned') + ' ([' + clean(row.title) + '](' + row.source_url + '))');
  lines.push('');
}
lines.push('## Cross-channel operating patterns', '', '- Both channels repeatedly frame financial or fundraising outcomes as systems and sequences rather than one-off actions.', '- Both channels use checklists, audits, scripts, templates, and repeatable communication as practical operating units.', '- Claims about approvals, credit outcomes, platform fees, legal remedies, income, and time-to-result require current verification before use in client work.', '', '## Claims requiring current verification', '');
const claims = [...new Set(records.flatMap(row => row.claims_requiring_current_verification || []).map(clean))].sort();
for (const claim of claims) lines.push('- ' + claim);
lines.push('', '## Reusable workflow seed', '', '1. Identify the stated goal, audience, and prerequisites from the source record.', '2. Separate the speaker\'s claim from evidence, opinion, example, and proposed tactic.', '3. Verify current legal, financial, platform, and outcome claims against primary sources.', '4. Convert supported recommendations into an owner, next action, evidence requirement, and review date in StarNet.', '5. Preserve the source video, transcript, intelligence record, and verification result together.');
fs.writeFileSync(path.join(root, 'SYNTHESIS.md'), lines.join('\n') + '\n');
console.log('SYNTHESIS_COMPILED ' + records.length);
