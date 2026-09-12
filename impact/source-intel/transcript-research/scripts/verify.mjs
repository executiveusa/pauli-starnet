import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const ledgerPath = path.join(root, 'coverage-ledger.json');
const reportPath = path.join(root, 'README.md');
if (!fs.existsSync(ledgerPath) || !fs.existsSync(reportPath)) process.exit(1);

const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
if (!Array.isArray(ledger.channels) || ledger.channels.length !== 2) process.exit(1);
const allowed = new Set(['retrieved', 'unavailable', 'failed_integrity', 'pending']);
let total = 0;
for (const channel of ledger.channels) {
  if (!channel.name || !channel.url || !Array.isArray(channel.videos)) process.exit(1);
  if (channel.videos.length !== 40 && !channel.discovery_gap) process.exit(1);
  const ids = new Set();
  for (const video of channel.videos) {
    for (const field of ['title', 'url', 'video_id', 'duration', 'publication', 'transcript_status', 'transcript_source']) {
      if (typeof video[field] !== 'string' || !video[field].trim()) process.exit(1);
    }
    if (!/^[A-Za-z0-9_-]{11}$/.test(video.video_id) || ids.has(video.video_id)) process.exit(1);
    if (!allowed.has(video.transcript_status)) process.exit(1);
    ids.add(video.video_id);
    if (video.transcript_status === 'retrieved') {
      if (!video.transcript_file) process.exit(1);
      const transcriptPath = path.join(root, video.transcript_file);
      if (!fs.existsSync(transcriptPath) || fs.statSync(transcriptPath).size < 100) process.exit(1);
    }
    if (video.intelligence_status !== 'extracted' || !video.intelligence_file) process.exit(1);
    const intelligencePath = path.join(root, video.intelligence_file);
    if (!fs.existsSync(intelligencePath)) process.exit(1);
    const intelligence = JSON.parse(fs.readFileSync(intelligencePath, 'utf8'));
    for (const field of ['major_ideas', 'actionable_recommendations', 'prerequisites', 'claims_requiring_current_verification', 'tools_templates_resources', 'proposed_workflow']) {
      if (!Array.isArray(intelligence[field])) process.exit(1);
    }
  }
  total += channel.videos.length;
}
const report = fs.readFileSync(reportPath, 'utf8');
for (const label of ['Retrieved', 'Unavailable', 'Failed integrity', 'Pending', `Total ledger entries: ${total}`]) {
  if (!report.includes(label)) process.exit(1);
}
console.log('TRANSCRIPT_LIBRARY_VERIFIED');
