'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const ALLOWED_TYPES = new Set(['mission','result','evaluation','health']);
const ALLOWED_TOP = new Set(['schema_version','event_id','observed_at','source','type','sensitivity','payload','evidence_refs','content_hash']);
const ALLOWED_SOURCES = [
  /^https:\/\/api\.thepaulieffect\.com\/terabithia\/health$/,
  /^yappyverse-codex-proof$/,
  /^fixture-(primary|paid|pi|health)$/,
  /^lightning-fixture$/,
  /^monitoring-fixture$/,
  /^legacy-watcher-fixture$/
];
const SECRET_KEY = /(token|authorization|cookie|password|passwd|secret|credential|private.?key|ssn|social.?security|api.?key|card.?number|contact.?email|(^|_)(email|phone|address|dob|date.?of.?birth)($|_)|home.?address)/i;
const SECRET_VALUE = /(\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|(?:\+\d(?:[ .()-]*\d){9,14}\b|\b\d{3}[ .()-]+\d{3}[ .()-]+\d{4}\b)|\b\d{4}-\d{2}-\d{2}\b|\b(?:dob|date of birth|address|home|access code|pin|otp)\s*[:=]\s*[^,;\n]{2,80}|\b\d{1,6}\s+[A-Za-z0-9 .'-]+\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Ln|Lane|Dr|Drive|Way)\b|bearer\s+[a-z0-9._~+/=-]{6,}|basic\s+[a-z0-9+/=]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|\b\d{3}[- ]?\d{2}[- ]?\d{4}\b|\b\d{10,11}\b|\b(?:ghp|github_pat|sk|rk)[_-][a-z0-9_-]{10,}\b|\bAIza[0-9A-Za-z_-]{20,}\b|\beyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\b)/i;
const PAID_ROUTE = /(^|[-_])(paid|premium|billable|astra|gpt-?6|hyperagent)([-_]|$)/i;
function stable(v){ if(Array.isArray(v)) return v.map(stable); if(v&&typeof v==='object') return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])); return v; }
function digest(v){ return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex'); }
function byteDigest(v){ return crypto.createHash('sha256').update(v).digest('hex'); }
function eventIdentityMaterial(raw){return {observed_at:new Date(raw.observed_at).toISOString(),source:String(raw.source),type:raw.type,sensitivity:raw.sensitivity,payload:stable(raw.payload),evidence_refs:raw.evidence_refs.map(String)};}
function derivedEventId(raw){return `evt:sha256:${digest(eventIdentityMaterial(raw))}`;}
function eventMaterial(raw){ return {schema_version:1,event_id:String(raw.event_id),...eventIdentityMaterial(raw)}; }
function looksLikeCard(v){ const digits=v.replace(/[ -]/g,''); if(!/^\d{13,19}$/.test(digits))return false; let sum=0,alt=false;for(let i=digits.length-1;i>=0;i--){let n=Number(digits[i]);if(alt&&(n*=2)>9)n-=9;sum+=n;alt=!alt;}return sum%10===0;}
function unsafePath(v,p='event'){
  if(typeof v==='string'&&(SECRET_VALUE.test(v)||looksLikeCard(v))) return p;
  if(!v||typeof v!=='object') return null;
  for(const [k,x] of Object.entries(v)){ const q=`${p}.${k}`; if(SECRET_KEY.test(k)) return q; const hit=unsafePath(x,q); if(hit)return hit; }
  return null;
}
function sourceAllowed(source){ return ALLOWED_SOURCES.some(re=>re.test(source)); }
function evidenceValid(source,ref){
  if(typeof ref!=='string'||!ref.trim()) return false;
  if(source.startsWith('https://')) return ref===source||/^receipt:\/\/runs\/live-public-health\/health\/(request|response)\.json$/.test(ref);
  if(source==='yappyverse-codex-proof') return /^https:\/\/github\.com\/executiveusa\/YAPPYVERSE-FACTORY\/blob\/c7b2048538f798a4359faa4b70feeeb5183e2887\//.test(ref);
  if(source==='lightning-fixture'||source==='fixture-primary') return /^trace:\/\/sha256\/[a-f0-9]{64}$/.test(ref);
  if(source==='monitoring-fixture'||source==='legacy-watcher-fixture') return /^source:\/\/sha256\/[a-f0-9]{64}$/.test(ref);
  if(/^fixture-/.test(source)) return /^fixture:\/\/sha256\/[a-f0-9]{64}$/.test(ref);
  return false;
}
const PAYLOAD_SCHEMA={
  mission:{mission_id:'id',status:'mission-status',paid_route:'boolean'},
  result:{mission_id:'id',status:'result-status',evidence:[{type:'evidence-type',ref:'reference'}]},
  evaluation:{mission_id:'id?',verdict:'verdict',origin_evidence_count:'count?',proposed_mutation:'boolean?'},
  health:{seeded:'boolean?',status:'health-status',service:'service?',timestamp:'timestamp?',version:'version?','dependencies?':{coolify:'dependency-status',coolify_version:'version?',services_count:'count?'}}
};
function validateShape(value,schema,p='payload'){
  if(!value||typeof value!=='object'||Array.isArray(value)) throw new Error(`${p} object required`);
  const allowed=new Set(Object.keys(schema).map(k=>k.endsWith('?')?k.slice(0,-1):k)); for(const k of Object.keys(value)) if(!allowed.has(k)) throw new Error(`payload field not allowlisted: ${p}.${k}`);
  for(const [raw,kind] of Object.entries(schema)){ const optional=raw.endsWith('?')||(typeof kind==='string'&&kind.endsWith('?')); const key=raw.endsWith('?')?raw.slice(0,-1):raw; const expected=typeof kind==='string'&&kind.endsWith('?')?kind.slice(0,-1):kind; if(value[key]===undefined){if(!optional)throw new Error(`payload missing ${p}.${key}`);continue;} if(Array.isArray(expected)){if(!Array.isArray(value[key]))throw new Error(`${p}.${key} must be array`);for(let i=0;i<value[key].length;i++)validateShape(value[key][i],expected[0],`${p}.${key}[${i}]`);} else if(typeof expected==='object')validateShape(value[key],expected,`${p}.${key}`); else if(expected==='count'){if(!Number.isInteger(value[key])||value[key]<0||value[key]>1000000000)throw new Error(`${p}.${key} invalid count`);} else if(expected==='id'){if(typeof value[key]!=='string'||!/^sha256:[a-f0-9]{64}$/.test(value[key]))throw new Error(`${p}.${key} invalid id`);} else if(expected==='reference'){if(typeof value[key]!=='string'||! /^(trace|artifact|external-state|log|document|source):\/\/sha256\/[a-f0-9]{64}$/.test(value[key]))throw new Error(`${p}.${key} invalid reference`);} else if(expected==='evidence-type'){if(!['artifact','tool_call','external_state','log','document','trace'].includes(value[key]))throw new Error(`${p}.${key} invalid evidence type`);} else if(expected==='mission-status'){if(!['queued','working','needs_human','blocked','done','failed','cancelled'].includes(value[key]))throw new Error(`${p}.${key} invalid mission status`);} else if(expected==='result-status'){if(!['working','needs_human','blocked','done','failed','cancelled'].includes(value[key]))throw new Error(`${p}.${key} invalid result status`);} else if(expected==='verdict'){if(!['pass','needs_correction','needs_evidence','insufficient_evidence'].includes(value[key]))throw new Error(`${p}.${key} invalid verdict`);} else if(expected==='health-status'||expected==='dependency-status'){if(typeof value[key]!=='string'||!/^[a-z][a-z0-9_-]{0,31}$/.test(value[key]))throw new Error(`${p}.${key} invalid status`);} else if(expected==='service'){if(value[key]!=='terabithia')throw new Error(`${p}.${key} invalid service`);} else if(expected==='timestamp'){if(!Number.isFinite(Date.parse(value[key])))throw new Error(`${p}.${key} invalid timestamp`);} else if(expected==='version'){if(typeof value[key]!=='string'||!/^[A-Za-z0-9._-]{1,64}$/.test(value[key]))throw new Error(`${p}.${key} invalid version`);} else if(typeof value[key]!==expected)throw new Error(`${p}.${key} must be ${expected}`); }
}
function assertFreeDeep(v,p='payload'){
  if(!v||typeof v!=='object')return; for(const [k,x] of Object.entries(v)){const q=`${p}.${k}`; if(/(paid.?route|is.?billable)/i.test(k)&&x===true)throw new Error(`paid route denied: ${q}`); if(/(cost|price|amount|spend)(.?usd)?/i.test(k)&&Number(x)>0)throw new Error(`paid cost denied: ${q}`); if(/model|provider|route/i.test(k)&&typeof x==='string'&&PAID_ROUTE.test(x))throw new Error(`paid model denied: ${q}`); assertFreeDeep(x,q);}
}
function normalize(raw,options={}){
  if(!raw||typeof raw!=='object'||Array.isArray(raw)) throw new Error('event object required');
  for(const k of Object.keys(raw)) if(!ALLOWED_TOP.has(k)) throw new Error(`unknown top-level field rejected: ${k}`);
  const unsafe=unsafePath(raw); if(unsafe) throw new Error(`secret/private data rejected: ${unsafe}`);
  if(!ALLOWED_TYPES.has(raw.type)) throw new Error('event type not allowlisted');
  if(!raw.event_id||!raw.observed_at||!raw.source) throw new Error('event_id, observed_at and source required');
  if(raw.event_id!==derivedEventId(raw)) throw new Error('event_id must be content-derived');
  if(!sourceAllowed(String(raw.source))) throw new Error('source not allowlisted');
  if(!['shared','restricted'].includes(raw.sensitivity)) throw new Error('sensitivity must be shared or restricted');
  if(!raw.payload||typeof raw.payload!=='object'||Array.isArray(raw.payload)) throw new Error('payload object required');
  if(!Array.isArray(raw.evidence_refs)||raw.evidence_refs.length===0) throw new Error('non-empty evidence_refs required');
  if(!raw.evidence_refs.every(r=>evidenceValid(String(raw.source),r))) throw new Error('evidence reference is unverifiable for source');
  let receipt_bindings=[];
  if(String(raw.source).startsWith('https://')){
    if(!options.receiptRoot) throw new Error('live source requires receiptRoot');
    const required=['receipt://runs/live-public-health/health/request.json','receipt://runs/live-public-health/health/response.json'];
    if(!required.every(r=>raw.evidence_refs.includes(r))) throw new Error('live source requires resolvable request and response receipts');
    if(raw.evidence_refs.some(r=>r.startsWith('receipt://')&&!required.includes(r))) throw new Error('unrecognized receipt URI');
    const receipt=validateReceipt(options.receiptRoot,'health'); const responseBytes=fs.readFileSync(path.join(options.receiptRoot,'health','response.json')); let responsePayload; try{responsePayload=JSON.parse(responseBytes.toString('utf8'));}catch{throw new Error('health receipt response is not JSON');} if(JSON.stringify(stable(responsePayload))!==JSON.stringify(stable(raw.payload)))throw new Error('live payload does not match receipt response'); const receiptTime=Date.parse(receipt.requested_at), observedTime=Date.parse(responsePayload.timestamp); if(raw.observed_at!==new Date(observedTime).toISOString()||Math.abs(observedTime-receiptTime)>300000)throw new Error('live observed_at is not receipt-derived or fresh'); const expectedLiveId=derivedEventId({...raw,observed_at:new Date(observedTime).toISOString(),payload:responsePayload}); if(raw.event_id!==expectedLiveId)throw new Error('live event_id is not receipt-derived');
    receipt_bindings=[{name:'health',request_sha256:`sha256:${byteDigest(fs.readFileSync(path.join(options.receiptRoot,'health','request.json')))}`,response_sha256:receipt.body_sha256,payload_sha256:`sha256:${digest(responsePayload)}`}];
  }
  assertFreeDeep(raw.payload); validateShape(raw.payload,PAYLOAD_SCHEMA[raw.type]);
  const material=eventMaterial(raw); const calculated=digest(material);
  if(typeof raw.content_hash!=='string'||!/^sha256:[a-f0-9]{64}$/.test(raw.content_hash)) throw new Error('sha256 content_hash required');
  if(raw.content_hash!==`sha256:${calculated}`) throw new Error('content_hash mismatch');
  const live=String(raw.source).startsWith('https://'); return {...material,content_hash:raw.content_hash,receipt_bindings,schema_valid:true,verification_level:live?'receipt-bound':'shape-only',verified:live};
}
function finding(id,severity,observed,evidence,hypothesis,recommended,createdAt){ const f={id,status:'open',severity,pattern_count:1,observed,evidence_refs:evidence,affected_goal_refs:[],hypothesis,recommended_change:recommended,expected_gain:'More truthful and auditable fleet state.',risk:'False positive requires human review.',approval_required:true,created_at:createdAt}; return {...f,content_hash:`sha256:${digest(f)}`}; }
function crossExamine(verified){ return {schema_version:1,events:verified.events.filter(e=>e.type==='evaluation'&&e.payload.verdict==='pass'&&e.payload.origin_evidence_count===0)}; }
function propose(verified,disagreements){
  const findings=[]; const disagreed=new Set(disagreements.events.map(e=>e.event_id));
  for(const e of verified.events){ const at=verified.generated_at;
    if(e.type==='result'&&e.payload.status==='done'&&(!Array.isArray(e.payload.evidence)||e.payload.evidence.length===0)) findings.push(finding(`missing-evidence-${e.event_id}`,'high','Completion has no evidence.',e.evidence_refs,'Result may be a false success.','Require an acceptance receipt before completion.',at));
    if(disagreed.has(e.event_id)) findings.push(finding(`false-pass-${e.event_id}`,'high','Evaluator passed a result with no acceptance evidence.',e.evidence_refs,'Evaluator rule is incomplete.','Add a deterministic evidence prerequisite.',at));
    if(e.type==='health'&&e.payload.seeded===true) findings.push(finding(`seeded-health-${e.event_id}`,'medium','Seeded health copy was presented as system state.',e.evidence_refs,'UI or watcher may confuse initialization with proof.','Exclude seeded events from live status.',at));
    if(e.type==='health'&&(e.payload.coolify==='unreachable'||e.payload.dependencies?.coolify==='unreachable')) findings.push(finding(`dependency-health-${e.event_id}`,'medium','Terabithia is reachable while Coolify reports unreachable.',e.evidence_refs,'Bridge presence does not prove dependency health.','Present bridge and dependency health separately.',at));
    if(e.payload.private_pi_data===true) findings.push(finding(`private-boundary-${e.event_id}`,'critical','Private Pi data entered shared watcher input.',e.evidence_refs,'Boundary adapter failed.','Quarantine the event and repair the redaction adapter.',at));
    if(e.payload.proposed_mutation===true) findings.push(finding(`mutation-${e.event_id}`,'high','Watcher proposed a direct mutation.',e.evidence_refs,'Watcher crossed the observe/propose boundary.','Convert the effect into a human-reviewed proposal.',at));
  } return {schema_version:1,cost_usd:0,findings};
}
function run(events,outDir,meta={}){
  const liveEvents=events.filter(e=>String(e.source||'').startsWith('https://')); const liveTimes=[...new Set(liveEvents.map(e=>new Date(e.observed_at).toISOString()))]; if(liveTimes.length>1)throw new Error('mixed live events require one receipt-derived observation time'); const generated_at=liveTimes[0]||(meta.generated_at||'1970-01-01T00:00:00.000Z'); if(liveTimes[0]&&meta.generated_at&&new Date(meta.generated_at).toISOString()!==liveTimes[0])throw new Error('live run time must equal receipt-derived observation time'); const receiptRoot=meta.receiptRoot||(events.some(e=>String(e.source||'').startsWith('https://'))?path.join(outDir,'00_source'):undefined); const normalized=events.map(e=>normalize(e,{receiptRoot})); fs.mkdirSync(outDir,{recursive:true});
  const manifest={schema_version:1,mode:meta.mode||'shadow',cost_usd:0,generated_at,events:normalized};
  const verified={schema_version:1,mode:manifest.mode,cost_usd:0,generated_at,events:manifest.events};
  const disagreements=crossExamine(verified); const proposals=propose(verified,disagreements); const findings=proposals.findings; const material=findings.length>0;
  const brief={schema_version:1,cost_usd:0,material_change:material,critical:findings.filter(f=>f.severity==='critical'),daily:material?findings:[],weekly:{finding_count:findings.length,by_severity:findings.reduce((a,f)=>(a[f.severity]=(a[f.severity]||0)+1,a),{})}};
  for(const [stage,name,value] of [['01_ingest','manifest.json',manifest],['02_verify','verified.json',verified],['03_cross-examine','disagreements.json',disagreements],['04_propose','proposals.json',proposals],['05_report','brief.json',brief]]){ const d=path.join(outDir,stage,'output');fs.mkdirSync(d,{recursive:true});fs.writeFileSync(path.join(d,name),JSON.stringify(value,null,2)+'\n'); }
  return {manifest,verified,disagreements,proposals,brief};
}
function rawEvent(fields){ const withId={...fields,event_id:derivedEventId(fields)}; const material=eventMaterial(withId); return {...material,content_hash:`sha256:${digest(material)}`}; }
function writeReceipt(dir,name,record,bytes){
  const target=path.join(dir,name); fs.mkdirSync(target,{recursive:true}); const responsePath=path.join(target,'response.json'); fs.writeFileSync(responsePath,bytes); const request={...record,response_encoding:'utf-8 exact bytes',body_sha256:`sha256:${byteDigest(bytes)}`}; fs.writeFileSync(path.join(target,'request.json'),JSON.stringify(request,null,2)+'\n'); return request;
}
function validateReceipt(dir,name){
  const contracts={health:{url:'https://api.thepaulieffect.com/terabithia/health',status:200},'protected-system-status':{url:'https://api.thepaulieffect.com/terabithia/api/v1/system/status',status:401},'protected-fleet-missions':{url:'https://api.thepaulieffect.com/terabithia/api/v1/fleet/missions',status:401}}; const contract=contracts[name]; if(!contract)throw new Error(`receipt name not allowlisted: ${name}`);
  const request=JSON.parse(fs.readFileSync(path.join(dir,name,'request.json'))); const bytes=fs.readFileSync(path.join(dir,name,'response.json')); if(request.body_sha256!==`sha256:${byteDigest(bytes)}`)throw new Error(`receipt body hash mismatch: ${name}`); if(request.response_encoding!=='utf-8 exact bytes')throw new Error(`receipt encoding missing: ${name}`); if(request.method!=='GET'||request.url!==contract.url||request.status!==contract.status||request.location!==null||!request.request_headers||Object.keys(request.request_headers).some(k=>k.toLowerCase()==='authorization'))throw new Error(`receipt metadata mismatch: ${name}`); const at=Date.parse(request.requested_at); if(!Number.isFinite(at)||at>Date.now()+300000||at<Date.parse('2026-01-01T00:00:00Z'))throw new Error(`receipt timestamp invalid: ${name}`); if(name==='health'){let body;try{body=JSON.parse(bytes.toString('utf8'));}catch{throw new Error('health receipt invalid JSON');}const bt=Date.parse(body.timestamp);if(!Number.isFinite(bt)||Math.abs(bt-at)>300000)throw new Error('health response timestamp outside receipt window');} return request;
}
async function captureGetReceipt(url,receiptDir,name,fetchImpl=fetch){ const requested_at=new Date().toISOString(); const r=await fetchImpl(url,{method:'GET',headers:{Accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(10000)}); const bytes=Buffer.from(await r.arrayBuffer()); const rec=writeReceipt(receiptDir,name,{requested_at,method:'GET',url,status:r.status,location:r.headers.get('location'),request_headers:{Accept:'application/json'}},bytes); if(r.status>=300&&r.status<400)throw new Error('redirect refused'); return {record:rec,bytes}; }
function exportPublicHealth(url,receiptDir,fetchImpl=fetch){
  const allowed='https://api.thepaulieffect.com/terabithia/health'; if(url!==allowed) throw new Error('health source not allowlisted'); if(!receiptDir) throw new Error('receiptDir required');
  return (async()=>{ const {record,bytes}=await captureGetReceipt(url,receiptDir,'health',fetchImpl); if(record.status<200||record.status>=300)throw new Error(`health HTTP ${record.status}`); const p=JSON.parse(bytes.toString('utf8')); const base='receipt://runs/live-public-health/health'; return rawEvent({event_id:`health-${Date.parse(p.timestamp||record.requested_at)}`,observed_at:p.timestamp||record.requested_at,source:url,type:'health',sensitivity:'shared',payload:p,evidence_refs:[url,`${base}/request.json`,`${base}/response.json`]}); })();
}

function generateFindingIndex(root){
  const states=['open','accepted','rejected','superseded']; const rows=[]; fs.mkdirSync(root,{recursive:true}); for(const status of states)fs.mkdirSync(path.join(root,status),{recursive:true});
  for(const status of states) for(const name of fs.readdirSync(path.join(root,status)).filter(n=>n.endsWith('.json')).sort()){ const rec=JSON.parse(fs.readFileSync(path.join(root,status,name))); if(rec.status!==status) throw new Error(`finding status/path mismatch: ${name}`); validateFinding(rec); rows.push({id:rec.id,status,path:`${status}/${name}`,content_hash:rec.content_hash}); }
  const text=rows.map(r=>JSON.stringify(r)).join('\n')+(rows.length?'\n':''); fs.writeFileSync(path.join(root,'_index.jsonl'),text); return rows;
}
function validateFinding(f){ const keys=['id','status','severity','pattern_count','observed','evidence_refs','affected_goal_refs','hypothesis','recommended_change','expected_gain','risk','approval_required','created_at','content_hash']; for(const k of keys) if(f[k]===undefined) throw new Error(`finding missing ${k}`); const copy={...f};delete copy.content_hash;if(f.content_hash!==`sha256:${digest(copy)}`)throw new Error('finding content_hash mismatch'); return true; }
module.exports={stable,digest,byteDigest,rawEvent,normalize,crossExamine,propose,run,validateReceipt,captureGetReceipt,exportPublicHealth,generateFindingIndex,validateFinding};
