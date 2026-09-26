'use strict';
const manifest = require('./manifest.json');
const IDS = new Set(manifest.agents.map(a => a.id));
const LANES = new Set(manifest.lanes);
const EFFECTS = new Set(['post','publish','bid','list','message','spend','create-account']);
function validate(agent, lane, effect) {
  if (!IDS.has(agent)) throw new Error('Unknown Cutie agent');
  if (!LANES.has(lane)) throw new Error('Unknown work lane');
  if (EFFECTS.has(effect)) throw new Error('External effect HELD for owner approval');
  if (effect !== 'draft') throw new Error('Only draft mode is available');
}
function prepare(agent, lane, brief) {
  validate(agent, lane, 'draft');
  if (typeof brief !== 'string' || brief.length < 1 || brief.length > 4000) throw new Error('Invalid brief');
  // A proposed Hermes dispatch envelope, deliberately NOT a network call.
  return Object.freeze({ manager: 'Hermes', district: `cuties-${agent}`, agent, lane,
    intent: brief, mode: 'draft', externalEffects: 'held', modelRoute: 'subscription-oauth-only' });
}
class Memory {
  constructor(pool) { if (!pool || typeof pool.connect !== 'function') throw new Error('Postgres pool required'); this.pool = pool; }
  async scoped(agent, work) {
    if (!IDS.has(agent)) throw new Error('Unknown Cutie agent');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('cuties.agent_id', $1, true)", [agent]);
      const value = await work(client);
      await client.query('COMMIT');
      return value;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  async remember(agent, kind, body, provenance) {
    if (!['fact','draft','receipt','decision'].includes(kind) || !body || typeof provenance !== 'string' || !provenance) throw new Error('Invalid memory');
    return this.scoped(agent, async db => {
      const {rows} = await db.query('INSERT INTO cuties.memory(agent_id,kind,body,provenance) VALUES ($1,$2,$3::jsonb,$4) RETURNING id,created_at', [agent,kind,JSON.stringify(body),provenance]);
      return rows[0];
    });
  }
  async recall(agent, limit=20) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('Invalid limit');
    return this.scoped(agent, async db => (await db.query('SELECT id,kind,body,provenance,created_at FROM cuties.memory WHERE agent_id=$1 ORDER BY created_at DESC LIMIT $2',[agent,limit])).rows);
  }
}
module.exports = {prepare,Memory};
