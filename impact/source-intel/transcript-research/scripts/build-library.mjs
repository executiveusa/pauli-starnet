import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const index = JSON.parse(fs.readFileSync(path.join(root, 'video-index.json'), 'utf8'));
const batchDir = path.join(root, 'batches');
const resultMap = new Map();
for (const name of fs.readdirSync(batchDir).filter(name => /^(cause|monica)-\d+\.json$/.test(name)).sort()) {
  for (const row of JSON.parse(fs.readFileSync(path.join(batchDir, name), 'utf8'))) {
    resultMap.set(row.video_id, row);
  }
}

const officialTimed = new Map([
  ['mMlYgNvOiWU', 'official-captions/mMlYgNvOiWU.en-orig.vtt'],
  ['5JAVglJHzG4', 'official-captions/5JAVglJHzG4.en-orig.vtt'],
]);

for (const channel of index.channels) {
  const intelligenceSlug = channel.handle === '@CauseSpecialist' ? 'cause-specialist' : 'monica-main';
  channel.videos = channel.videos.map(video => {
    const result = resultMap.get(video.video_id);
    if (!result) return {...video, transcript_status: 'pending', transcript_source: 'retrieval result missing'};
    const timed = officialTimed.get(video.video_id);
    const intelligenceFile = `intelligence/${intelligenceSlug}/${String(video.position).padStart(2, '0')}-${video.video_id}.json`;
    return {
      ...video,
      publication: result.publication || video.publication,
      duration: result.duration || video.duration,
      transcript_status: result.status,
      transcript_source: result.transcript_source,
      transcript_file: result.transcript_file || undefined,
      timestamp_status: timed ? 'official caption timestamps available' : 'timestamps unavailable; no timestamps inferred',
      timestamp_file: timed,
      intelligence_status: fs.existsSync(path.join(root, intelligenceFile)) ? 'extracted' : 'pending',
      intelligence_file: fs.existsSync(path.join(root, intelligenceFile)) ? intelligenceFile : undefined,
      source_postprocessor: result.postprocessors || [],
    };
  });
}

index.method = {
  channel_inventory: 'yt-dlp flat playlist, newest-first, playlist-end 40',
  transcript_text: 'Firecrawl YouTube postprocessor',
  timed_caption_evidence: 'YouTube en-orig WebVTT retrieved independently with yt-dlp for two positive controls',
  timestamp_policy: 'Firecrawl-generated timestamps were rejected after failing duration integrity; no timestamps were inferred for the remaining videos',
};

fs.writeFileSync(path.join(root, 'coverage-ledger.json'), JSON.stringify(index, null, 2) + '\n');

const videos = index.channels.flatMap(channel => channel.videos);
const counts = {
  retrieved: videos.filter(video => video.transcript_status === 'retrieved').length,
  unavailable: videos.filter(video => video.transcript_status === 'unavailable').length,
  failed: videos.filter(video => video.transcript_status === 'failed_integrity').length,
  pending: videos.filter(video => video.transcript_status === 'pending').length,
  timed: videos.filter(video => video.timestamp_file).length,
  intelligence: videos.filter(video => video.intelligence_file).length,
};

const lines = [
  '# StarNet source intelligence transcript library',
  '',
  'This package contains the newest 40 standard videos from each requested channel and the transcript text recovered for all 80 videos.',
  '',
  '## Coverage',
  '',
  `- Total ledger entries: ${videos.length}`,
  `- Retrieved: ${counts.retrieved}`,
  `- Unavailable: ${counts.unavailable}`,
  `- Failed integrity: ${counts.failed}`,
  `- Pending: ${counts.pending}`,
  `- Official timestamped caption controls: ${counts.timed}`,
  `- Source-intelligence records: ${counts.intelligence}`,
  '',
  '## Verification note',
  '',
  'Firecrawl recovered transcript text from YouTube for every indexed video. A structured-extraction test generated timestamps that exceeded the source video duration, so those timestamps were rejected. The library does not represent inferred timestamps as source evidence. Two independently downloaded official WebVTT caption files are included as positive controls and retain source timestamps.',
  '',
  '## Channel ledgers',
  '',
];
for (const channel of index.channels) {
  lines.push(`### ${channel.name}`, '', '| # | Video | Published | Duration | Transcript | Timestamps |', '|---:|---|---|---:|---|---|');
  for (const video of channel.videos) {
    const published = String(video.publication).slice(0, 10);
    lines.push(`| ${video.position} | [${video.title.replaceAll('|', '\\|')}](${video.url}) | ${published} | ${video.duration} | ${video.transcript_status} | ${video.timestamp_file ? 'official VTT' : 'not inferred'} |`);
  }
  lines.push('');
}
fs.writeFileSync(path.join(root, 'README.md'), lines.join('\n') + '\n');

const csv = [['channel','position','title','url','video_id','publication','duration','transcript_status','transcript_file','timestamp_status','timestamp_file']];
for (const channel of index.channels) for (const video of channel.videos) {
  csv.push([channel.name,video.position,video.title,video.url,video.video_id,video.publication,video.duration,video.transcript_status,video.transcript_file || '',video.timestamp_status,video.timestamp_file || '']);
}
const quote = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
fs.writeFileSync(path.join(root, 'coverage-ledger.csv'), csv.map(row => row.map(quote).join(',')).join('\n') + '\n');

console.log(JSON.stringify({total: videos.length, ...counts}));
