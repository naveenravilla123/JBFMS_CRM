import test from "node:test";
import assert from "node:assert/strict";
import {createHmac} from "node:crypto";
import {parseWebsite,parseMeta,verifyMetaSignature,addInbound} from "./intake.js";
test("website requires customer identity and validates readiness",()=>{
 assert.throws(()=>parseWebsite({name:"Someone"}),/phone/);
 const [x]=parseWebsite({name:"Ravi",phone:"+91 9876543210",service:"2 BHK Cleaning",address:"Nellore",date:"2026-12-01",time:"09:30",submissionId:"abc"});
 assert.equal(x.ready,true);assert.equal(x.externalId,"abc");
 assert.equal(parseWebsite({name:"Ravi",phone:"9876543210"})[0].ready,false);
});
test("Meta webhook signature uses raw-body HMAC",()=>{
 const body=Buffer.from('{"hello":1}');const secret="secure-test-secret";const hash=createHmac("sha256",secret).update(body).digest("hex");
 assert.equal(verifyMetaSignature(body,"sha256="+hash,secret),true);
 assert.equal(verifyMetaSignature(body,"sha256="+hash,"wrong"),false);
 assert.equal(verifyMetaSignature(body,"not-valid",secret),false);
});
test("WhatsApp, Instagram and Facebook message parsing",()=>{
 const wa={object:"whatsapp_business_account",entry:[{changes:[{field:"messages",value:{contacts:[{wa_id:"919800000000",profile:{name:"Ravi"}}],messages:[{id:"wamid.1",from:"919800000000",type:"text",text:{body:"Need house cleaning"}}],statuses:[{id:"status"}]}}]}]};
 const [w]=parseMeta(wa);assert.equal(w.source,"WhatsApp");assert.equal(w.customerName,"Ravi");
 const ig={object:"instagram",entry:[{messaging:[{sender:{id:"user-1"},message:{mid:"mid-1",text:"Need quote"}},{sender:{id:"user-2"},message:{mid:"mid-2",is_echo:true,text:"reply"}}]}]};
 assert.equal(parseMeta(ig).length,1);assert.equal(parseMeta(ig)[0].source,"Instagram");
 assert.equal(parseMeta({...ig,object:"page"})[0].source,"Facebook");
});
test("dedupe webhook retry and ignore delivery status",()=>{
 const store={counter:0,inbound:[]};const items=parseWebsite({name:"Ravi",phone:"9876543210",submissionId:"unique-1"});
 assert.equal(addInbound(store,items),1);assert.equal(addInbound(store,items),0);assert.equal(store.inbound.length,1);
 assert.equal(parseMeta({object:"whatsapp_business_account",entry:[{changes:[{field:"messages",value:{statuses:[{id:"x"}]}}]}]}).length,0);
});
