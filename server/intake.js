import {createHmac,timingSafeEqual} from "node:crypto";
const trim=(v,max=500)=>String(v??"").trim().slice(0,max);
export function verifyMetaSignature(raw,header,secret){
 if(!secret||!/^sha256=[a-f0-9]{64}$/i.test(String(header||"")))return false;
 const actual=Buffer.from(header.slice(7),"hex");
 const expected=createHmac("sha256",secret).update(raw).digest();
 return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
export function parseWebsite(input={}){
 if(!input||typeof input!=="object"||Array.isArray(input))return [];
 const name=trim(input.name||input.customerName,120),phone=trim(input.phone||input.mobile,24);
 if(!name||!phone)throw Object.assign(new Error("Customer name and phone are required"),{status:422});
 if(!/^[+\d()\s-]{7,24}$/.test(phone))throw Object.assign(new Error("Invalid phone number"),{status:422});
 const date=trim(input.date||input.serviceDate,10),time=trim(input.time||input.serviceTime,5);
 const address=trim(input.address||input.serviceAddress,500);
 const service=trim(input.service||input.serviceName,150);
 const validDate=/^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(date+"T00:00:00"));
 const validTime=/^([01]\d|2[0-3]):[0-5]\d$/.test(time);
 return [{source:"Website",externalId:trim(input.eventId||input.submissionId||"",150),customerName:name,phone,email:trim(input.email,160),text:trim(input.message||input.notes,2000),service,address,date:validDate?date:"",time:validTime?time:"",package:trim(input.package,40),status:"New",ready:!!(service&&address&&validDate&&validTime)}];
}
export function parseMeta(payload){
 const list=[];
 if(!payload||!Array.isArray(payload.entry))return list;
 if(payload.object==="whatsapp_business_account"){
  for(const entry of payload.entry)for(const change of entry.changes||[]){
    if(change.field!=="messages")continue;
    const val=change.value||{};
    for(const msg of val.messages||[]){
      if(!msg.id||!msg.from)continue;
      const profile=(val.contacts||[]).find(c=>c.wa_id===msg.from)?.profile?.name||"WhatsApp customer";
      const body=msg.type==="text"?msg.text?.body:msg.type==="button"?msg.button?.text:msg.type==="interactive"?JSON.stringify(msg.interactive||{}):"[Non-text WhatsApp message: "+trim(msg.type,30)+"]";
      list.push({source:"WhatsApp",externalId:trim(msg.id,150),customerName:trim(profile,120),phone:trim(msg.from,24),externalUserId:trim(msg.from,100),text:trim(body,2000),status:"New",ready:false});
    }
  }
 }else if(["instagram","page"].includes(payload.object)){
  for(const entry of payload.entry){
   for(const msg of entry.messaging||[]){
    if(msg.message?.is_echo||!msg.sender?.id||!msg.message?.mid)continue;
    const source=payload.object==="instagram"?"Instagram":"Facebook";
    const message=msg.message;
    list.push({source,externalId:trim(message.mid,150),customerName:source+" user",phone:"",externalUserId:trim(msg.sender.id,100),text:trim(message.text||(message.attachments?.length?"[Attachment received]":"[Message received]"),2000),status:"New",ready:false});
   }
  }
 }
 return list;
}
export function addInbound(data,items){
 let added=0;
 for(const item of items){
  // Upstream website must send an immutable submission id for retry deduplication.
  if(item.externalId&&data.inbound.some(x=>x.source===item.source&&x.externalId===item.externalId))continue;
  const id="IN-"+String(++data.counter).padStart(6,"0");
  data.inbound.unshift({id,...item,receivedAt:new Date().toISOString()});added++;
 }
 return added;
}
