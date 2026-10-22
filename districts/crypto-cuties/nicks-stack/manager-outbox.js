'use strict';
// A local, held intake queue. This never calls the network or represents a Hermes receipt.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {prepare} = require('./runtime');
function queueDraft(root, agent, lane, brief, provenance) {
  if (typeof provenance !== 'string' || !provenance || provenance.length > 500) throw Error('Source provenance required');
  const envelope = prepare(agent, lane, brief);
  const dir = path.resolve(root);
  fs.mkdirSync(dir, {recursive:true, mode:0o700});
  const id = crypto.randomUUID();
  const record = {id, state:'HELD', createdAt:new Date().toISOString(), provenance, envelope};
  const tmp = path.join(dir, `.${id}.tmp`);
  const target = path.join(dir, `${id}.json`);
  try {
    fs.writeFileSync(tmp, JSON.stringify(record,null,2)+'\n', {mode:0o600, flag:'wx'});
    fs.renameSync(tmp,target);
  } catch(error) { try { fs.unlinkSync(tmp); } catch {} throw error; }
  return {id, state:'HELD', localPath:target};
}
module.exports={queueDraft};
