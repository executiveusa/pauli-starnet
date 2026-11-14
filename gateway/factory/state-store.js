'use strict';
// STARFACTORY-001: bridge-local durable state. This is NOT a mission database (Paperclip is the authority).
// It holds only what the bridge needs to be safe across restarts:
//   receipts    - one per (runId): the executor result, so a duplicate wake or a replay never repeats a side effect
//   checkpoints - one per (taskId): where a worker run was, so recovery resumes or fails visibly
//   control     - the emergency-stop flag
//   locks       - one exclusive lock file per task, so two runs can never execute the same task at once
// One JSON file per record, written atomically (tmp + rename), mode 0600.
const fs = require('fs');
const path = require('path');

const SAFE = /^[A-Za-z0-9_.:-]{1,160}$/;
const fileSafe = (id) => String(id).replace(/:/g, '~');

function makeStateStore(dir, { now = () => new Date().toISOString() } = {}) {
  const sub = (n) => { const d = path.join(dir, n); fs.mkdirSync(d, { recursive: true, mode: 0o700 }); return d; };
  const dirs = { receipts: sub('receipts'), checkpoints: sub('checkpoints'), control: sub('control'), locks: sub('locks') };

  function write(kind, id, value) {
    if (!SAFE.test(String(id))) throw new Error('unsafe id for ' + kind);
    const file = path.join(dirs[kind], fileSafe(id) + '.json');
    const tmp = file + '.tmp-' + process.pid;
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2), { mode: 0o600 });
    fs.renameSync(tmp, file);
    return value;
  }
  function read(kind, id) {
    if (!SAFE.test(String(id))) return null;
    try { return JSON.parse(fs.readFileSync(path.join(dirs[kind], fileSafe(id) + '.json'), 'utf8')); } catch { return null; }
  }
  function all(kind) {
    const out = [];
    for (const f of fs.readdirSync(dirs[kind])) {
      if (!f.endsWith('.json')) continue;
      try { out.push(JSON.parse(fs.readFileSync(path.join(dirs[kind], f), 'utf8'))); } catch { /* skip torn file */ }
    }
    return out;
  }

  // Exclusive per-task lock: O_EXCL create, so it holds across processes on one host. A lock left behind by a process
  // that is no longer alive (crash, SIGKILL) is stale and may be taken over; a live holder is never displaced.
  const lockFile = (taskId) => {
    if (!SAFE.test(String(taskId))) throw new Error('unsafe id for lock');
    return path.join(dirs.locks, fileSafe(taskId) + '.lock');
  };
  const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
  function readLock(taskId) { try { return JSON.parse(fs.readFileSync(lockFile(taskId), 'utf8')); } catch { return null; } }
  function acquireTaskLock(taskId, runId) {
    const file = lockFile(taskId);
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const fd = fs.openSync(file, 'wx', 0o600);
        fs.writeSync(fd, JSON.stringify({ taskId, runId, pid: process.pid, at: now() }));
        fs.closeSync(fd);
        return { ok: true };
      } catch (e) {
        if (e.code !== 'EEXIST') throw e;
        const holder = readLock(taskId);
        if (holder && holder.pid && alive(holder.pid)) return { ok: false, holder };
        try { fs.unlinkSync(file); } catch { /* raced with another taker: loop and retry */ }
      }
    }
    return { ok: false, holder: readLock(taskId) };
  }
  function releaseTaskLock(taskId, runId) {
    const holder = readLock(taskId);
    if (holder && holder.runId === runId) { try { fs.unlinkSync(lockFile(taskId)); } catch { /* already gone */ } }
  }

  return {
    acquireTaskLock, releaseTaskLock, readTaskLock: readLock,
    getReceipt: (runId) => read('receipts', runId),
    putReceipt: (runId, rec) => write('receipts', runId, Object.assign({ runId, at: now() }, rec)),
    allReceipts: () => all('receipts'),
    getCheckpoint: (taskId) => read('checkpoints', taskId),
    putCheckpoint: (taskId, cp) => write('checkpoints', taskId, Object.assign({}, cp, { taskId, updatedAt: now() })),
    allCheckpoints: () => all('checkpoints'),
    isStopped: () => !!read('control', 'stop'),
    stopInfo: () => read('control', 'stop'),
    setStopped: (info) => write('control', 'stop', Object.assign({ at: now() }, info)),
    clearStopped: () => { try { fs.unlinkSync(path.join(dirs.control, 'stop.json')); } catch { /* not set */ } }
  };
}

module.exports = { makeStateStore };
