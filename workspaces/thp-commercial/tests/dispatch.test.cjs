'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {processIntent,classify}=require('../agent/dispatch.cjs');
const auth={verifyActor:({actor,identity})=>actor==='thp-owner'&&identity==='verified-staging-test'};
function run(text,over={}){return processIntent({tenantId:'thp-commercial',actorId:'thp-owner',identity:'verified-staging-test',channel:'staging',requestId:'demo-1',text,...over},auth)}
test('unverified identity denied',()=>assert.equal(processIntent({tenantId:'thp-commercial',text:'services'},{}).status,'denied'));
test('cross-tenant request denied',()=>assert.equal(run('any bids?',{tenantId:'other'}).status,'denied'));
test('approved facts available',()=>{let r=run('what services?');assert.equal(r.status,'answered');assert.match(r.answer,/flooring/)});
test('live leads blocked without dedicated DB',()=>{assert.equal(run('any new bids?').status,'blocked');assert.equal(run('what is due tomorrow?').status,'blocked')});
test('restricted actions never execute',()=>{for(const cmd of ['follow up with GC','send a text','delete a lead','launch site']){let r=run(cmd);assert.equal(r.status,'approval_required');assert.equal(r.request.executed,false)}});
test('retry stable receipt',()=>{assert.equal(run('any new bids?').receiptId,run('any new bids?').receiptId);assert.notEqual(run('any new bids?').receiptId,run('any new bids?',{requestId:'other'}).receiptId)});
test('fixed simple intents',()=>{assert.equal(classify('show open bids'),'read_leads');assert.equal(classify('tell me a joke'),'clarify')});
