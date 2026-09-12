import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const indexPath = path.join(root, 'video-index.json');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

function parsePacked(value) {
  const parts = String(value).split('\\t');
  if (parts.length < 4) throw new Error(`Could not parse packed video row: ${value}`);
  return {video_id: parts[0], title: parts.slice(1, -2).join('\\t'), duration: parts.at(-2), publication: parts.at(-1)};
}

for (const channel of index.channels) {
  for (const video of channel.videos) {
    const clean = parsePacked(video.video_id);
    Object.assign(video, clean, {
      url: `https://www.youtube.com/watch?v=${clean.video_id}`,
      publication: clean.publication === 'NA' ? 'relative date pending exact metadata' : clean.publication,
    });
  }
}
fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n');

for (const name of fs.readdirSync(path.join(root, 'batches')).filter(name => /^(cause|monica)-/.test(name))) {
  const file = path.join(root, 'batches', name);
  const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
  const slug = name.startsWith('cause-') ? 'cause-specialist' : 'monica-main';
  for (const row of rows) {
    const clean = parsePacked(row.video_id);
    const oldPath = row.transcript_file ? path.join(root, row.transcript_file) : null;
    const newRel = `transcripts/${slug}/${String(row.position).padStart(2, '0')}-${clean.video_id}.md`;
    const newPath = path.join(root, newRel);
    if (oldPath && fs.existsSync(oldPath)) {
      fs.mkdirSync(path.dirname(newPath), {recursive: true});
      fs.renameSync(oldPath, newPath);
      row.transcript_file = newRel;
    }
    row.video_id = clean.video_id;
  }
  fs.writeFileSync(file, JSON.stringify(rows, null, 2) + '\n');
}

const intelRoot = path.join(root, 'intelligence', 'cause-specialist');
if (fs.existsSync(intelRoot)) {
  for (const current of fs.readdirSync(intelRoot, {recursive: true}).filter(name => name.endsWith('.json'))) {
    const oldPath = path.join(intelRoot, current);
    if (!fs.statSync(oldPath).isFile()) continue;
    const record = JSON.parse(fs.readFileSync(oldPath, 'utf8'));
    const clean = parsePacked(record.video_id);
    const position = index.channels[0].videos.find(video => video.video_id === clean.video_id)?.position;
    if (!position) continue;
    record.video_id = clean.video_id;
    record.title = clean.title;
    record.source_url = `https://www.youtube.com/watch?v=${clean.video_id}`;
    const newPath = path.join(intelRoot, `${String(position).padStart(2, '0')}-${clean.video_id}.json`);
    fs.mkdirSync(path.dirname(newPath), {recursive: true});
    fs.writeFileSync(newPath, JSON.stringify(record, null, 2) + '\n');
    if (newPath !== oldPath) fs.rmSync(oldPath);
  }
}

function removeEmptyDirectories(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    if (entry.isDirectory()) removeEmptyDirectories(path.join(dir, entry.name));
  }
  if (dir !== root && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
}
removeEmptyDirectories(path.join(root, 'transcripts'));
removeEmptyDirectories(path.join(root, 'intelligence'));
console.log('INDEX_REPAIRED');
