'use strict';
const {parseSignedEvent,admitOwner}=require('../channels/whatsapp-cloud.cjs');
const {processIntent}=require('../agent/dispatch.cjs');
/**
 * Ingress orchestration contract for approved WhatsApp Business Cloud API.
 * All I/O is injected; no hidden credentials, no implicit writes.
 * claimInbox must atomically persist providerMessageId with a unique constraint.
 * recordReceipt must durably record the result before a reply can leave the process.
 */
async function ingestWhatsApp({rawBody,signature,appSecret,lookupOwner,claimInbox,recordReceipt,sendText}={}){
 const parsed=parseSignedEvent(rawBody,signature,appSecret);
 if(!parsed.ok)return {ok:false,error:parsed.error,processed:0};
 if(typeof lookupOwner!=='function'||typeof claimInbox!=='function'||typeof recordReceipt!=='function'||typeof sendText!=='function')return {ok:false,error:'dependencies_not_ready',processed:0};
 let accepted=0,duplicate=0,rejected=0;
 for(const event of parsed.messages){
  const admit=admitOwner(event,lookupOwner);
  if(!admit.ok){rejected++;continue}
  const identity=admit.identity;
  // The service must atomically store and dedupe the event before invoking a tool/agent.
  let claim;
  try{claim=await claimInbox({tenantId:'thp-commercial',provider:'whatsapp_cloud',providerMessageId:event.providerMessageId,actorId:identity.actorId,contentDigest:null})}
  catch{return {ok:false,error:'inbox_persistence_failed',processed:accepted,duplicate,rejected}}
  if(claim?.duplicate===true){duplicate++;continue}
  if(claim?.persisted!==true)return {ok:false,error:'inbox_unconfirmed',processed:accepted,duplicate,rejected};
  const decision=processIntent({tenantId:'thp-commercial',actorId:identity.actorId,identity,channel:'whatsapp_cloud',text:event.text,requestId:event.providerMessageId},{verifyActor:({actor,identity:verified})=>actor===verified?.actorId&&verified?.verified===true});
  if(!decision.ok){rejected++;continue}
  // Do not send a blank response if a private-data executor has not been implemented.
  if(typeof decision.answer!=='string'||!decision.answer.trim())return {ok:false,error:'agent_response_unavailable',processed:accepted,duplicate,rejected};
  // No real-world external action is allowed by the current router. Only status or a request for approval.
  let stored;
  try{stored=await recordReceipt({tenantId:'thp-commercial',providerMessageId:event.providerMessageId,receiptId:decision.receiptId,intent:decision.intent,status:decision.status})}
  catch{return {ok:false,error:'receipt_persistence_failed',processed:accepted,duplicate,rejected}}
  if(stored?.persisted!==true)return {ok:false,error:'receipt_unconfirmed',processed:accepted,duplicate,rejected};
  let delivery;
  try{delivery=await sendText({to:event.senderId,phoneNumberId:event.phoneNumberId,body:decision.answer,receiptId:decision.receiptId})}
  catch{return {ok:false,error:'channel_delivery_failed',processed:accepted,duplicate,rejected,receiptId:decision.receiptId}}
  if(delivery?.accepted!==true)return {ok:false,error:'channel_delivery_unconfirmed',processed:accepted,duplicate,rejected,receiptId:decision.receiptId};
  accepted++;
 }
 return {ok:true,processed:accepted,duplicate,rejected};
}
module.exports={ingestWhatsApp};
