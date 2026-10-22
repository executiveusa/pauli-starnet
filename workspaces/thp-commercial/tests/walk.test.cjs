'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
test('ICM cold-start uses three reads and deterministic routing',()=>{
 const entry=fs.readFileSync(path.join(root,'CONTEXT.md'),'utf8');
 const contract=fs.readFileSync(path.join(root,'nodes/dispatch/CONTRACT.md'),'utf8');
 const status=JSON.parse(fs.readFileSync(path.join(root,'state/STATUS.json'),'utf8'));
 const cfg=JSON.parse(fs.readFileSync(path.join(root,'config/tenant.json'),'utf8'));
 assert.match(entry,/Start here/);assert.match(contract,/READ_LEADS/);assert.equal(status.tenant,cfg.tenant_id);
 assert.notEqual(status.phase,'live');assert.equal(cfg.runtime.activation,'disabled_until_proven');
 assert.equal(cfg.security.allow_shared_botanic_db_for_live_customer_data,false);
 assert.equal(cfg.owner_interface.whatsapp.status,'not_connected');
 assert.equal(cfg.owner_interface.imessage.status,'not_connected');
 assert.match(contract,/Human check/);
});
test('Client-specific facts are separate from reusable workflow protocol',()=>{
 const business=fs.readFileSync(path.join(root,'knowledge/FACTS.md'),'utf8');
 assert.match(business,/Northwest Washington/);
 assert.doesNotMatch(business,/\b(?:sk-[a-zA-Z0-9]{20,}|sb_secret_)/);
});
