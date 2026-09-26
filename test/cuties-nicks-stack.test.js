'use strict';
const assert = require('node:assert/strict');
const {test} = require('node:test');
const {prepare,Memory} = require('../districts/crypto-cuties/nicks-stack/runtime');
test('five isolated slots draft through Hermes and reject all effects', () => {
  for(let i=1;i<=5;i++) { const id=`cc00${i}`; const d=prepare(id,'fiverr','Draft a sample UGC pitch'); assert.equal(d.district,`cuties-${id}`); assert.equal(d.manager,'Hermes'); assert.equal(d.externalEffects,'held'); }
  assert.throws(()=>prepare('cc006','fiverr','x'));
  assert.throws(()=>prepare('cc001','unsupported','x'));
  assert.throws(()=>prepare('cc001','upwork',''),/Invalid brief/);
});
test('Postgres memory uses transaction-local agent scope and parameterized writes', async () => {
  const calls=[];
  const db={query:async(sql, params)=>{calls.push({sql,params}); return {rows:[{id:1}]};},release:()=>calls.push({sql:'release'})};
  const mem=new Memory({connect:async()=>db});
  await mem.remember('cc001','draft',{text:'sample'},'local:test');
  await mem.recall('cc002');
  assert.equal(calls.filter(c=>c.sql==='BEGIN').length,2);
  assert.deepEqual(calls.filter(c=>c.sql.includes('set_config')).map(c=>c.params),[['cc001'],['cc002']]);
  assert.ok(calls.some(c=>c.sql.includes('INSERT') && c.params[0]==='cc001'));
  assert.ok(calls.every(c=>!c.sql.includes('sample')));
  assert.equal(calls.filter(c=>c.sql==='COMMIT').length,2);
});
test('failed write rolls back and releases connection',async()=>{
  let released=false, rolled=false;
  const db={query:async(sql)=>{if(sql.includes('INSERT')) throw Error('database down'); if(sql==='ROLLBACK') rolled=true; return {rows:[]}}, release:()=>{released=true}};
  await assert.rejects(new Memory({connect:async()=>db}).remember('cc001','fact',{a:1},'test'));
  assert.ok(released && rolled);
});
test('Nick template renderer is offline, five configs retain Nick components but pin subscription OAuth',()=>{
  const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
  const {render}=require('../districts/crypto-cuties/nicks-stack/build');
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cuties-template-'));
  const upstream=path.join(tmp,'upstream'); fs.mkdirSync(path.join(upstream,'files'),{recursive:true});
  fs.writeFileSync(path.join(upstream,'files/config.yaml'),'model:\n  default: openai/gpt-5.5\n  provider: nous\nplugins: nick\n');
  fs.writeFileSync(path.join(upstream,'files/SOUL.md'),'Nick stack SOUL\n');
  assert.equal(render(upstream,path.join(tmp,'out')),5);
  for(let i=1;i<=5;i++){
    const room=path.join(tmp,'out',`cuties-cc00${i}`);
    const cfg=fs.readFileSync(path.join(room,'config.yaml'),'utf8');
    assert.match(cfg,/provider: openai-codex/); assert.match(cfg,/plugins: nick/);
    assert.match(fs.readFileSync(path.join(room,'SOUL.md'),'utf8'),/No external effects/);
    assert.equal(fs.statSync(path.join(room,'config.yaml')).mode & 0o777,0o600);
  }
  fs.rmSync(tmp,{recursive:true,force:true});
});
