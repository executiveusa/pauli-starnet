'use strict';
const fs=require('node:fs'),path=require('node:path');
function scaffold({root=path.resolve(__dirname,'..'),tenantId,displayName,vertical}={}){
 if(!/^[a-z][a-z0-9-]{2,40}$/.test(String(tenantId||'')))throw Error('invalid_tenant_id');
 if(typeof displayName!=='string'||displayName.trim().length<3||displayName.trim().length>90)throw Error('invalid_business_name');
 if(!/^[a-z][a-z0-9_]{2,40}$/.test(String(vertical||'')))throw Error('invalid_vertical');
 const dest=path.join(root,'workspaces',tenantId);
 if(fs.existsSync(dest))throw Error('tenant_already_exists');
 const cfg={schema_version:'1.0.0',tenant_id:tenantId,display_name:displayName.trim(),vertical,owner_interface:{primary:'not_connected',whatsapp:{status:'not_connected'},imessage:{status:'not_connected'}},runtime:{orchestrator:'not_assigned',activation:'disabled_until_proven'},security:{tenant_host_binding:'server_side',public_lead_access:false,operator_auth:'individual_identity_mfa',tenant_database:'dedicated_isolated_project_required',secrets:'server_only'},capabilities:{company_facts:'owner_approval_pending',lead_lookup:'disabled',outbound_messages:'disabled',quote_generation:'disabled'}};
 const state={tenant:tenantId,phase:'new_company_not_live',owner_channel:'not_connected',database:'not_connected',customer_data_access:'disabled',next_gate:'Obtain verified business information, approved channel, tenant-private DB and RLS walk proof.'};
 const content={
  'CONTEXT.md':`# ${displayName.trim()} | agent entry\nStatus: NOT LIVE. First read this entry, then nodes/dispatch/CONTRACT.md and state/STATUS.json.\nPurpose: one chat-facing owner agent. No dashboard needed for routine tasks.\nBusiness facts: knowledge/FACTS.md. Never invent them.\nHuman approval before sending messages, quotes, money, deletion or publishing.\nDo not inherit THP identity, logo, locations, license, contacts or client data.\n`,
  'nodes/dispatch/CONTRACT.md':'# Dispatch node\nInput: trusted channel identity, tenant ID derived server-side, message ID, user intent.\nJob: verify sender, apply default-deny tenant policy, load approved facts or private runtime adapters, prepare human approval before writes.\nOutput: response and durable action/receipt reference, never raw credentials.\nHuman check: owner approval required before enabling any action or sender.\nStatus: state/STATUS.json relative to workspace root.\n',
  'state/STATUS.json':JSON.stringify(state,null,2)+'\n',
  'config/tenant.json':JSON.stringify(cfg,null,2)+'\n',
  'knowledge/FACTS.md':'# Company facts — awaiting explicit owner verification\nNo names, phone numbers, pricing, coverage promises, warranties, portfolio, testimonials or license assertions supplied.\nSource each approved claim and record a version before use. Do not copy another client.\n'
 };
 for(const [name,text] of Object.entries(content)){const f=path.join(dest,name);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,text,{encoding:'utf8',flag:'wx',mode:0o600})}
 return {tenantId,workspace:path.relative(root,dest),files:Object.keys(content),activation:'disabled'};
}
if(require.main===module){try{const [tenantId,vertical,...nameParts]=process.argv.slice(2);const result=scaffold({tenantId,vertical,displayName:nameParts.join(' ')});process.stdout.write(JSON.stringify(result)+'\n')}catch(e){process.stderr.write(e.message+'\n');process.exitCode=1}}
module.exports={scaffold};
