import http from "node:http";
import {readFile,writeFile,rename,mkdir} from "node:fs/promises";
import {resolve,extname,dirname,sep} from "node:path";
import {randomUUID,timingSafeEqual} from "node:crypto";
import {parseWebsite,parseMeta,verifyMetaSignature,addInbound} from "./intake.js";
const root=resolve(process.cwd()),dataFile=resolve(process.env.DATA_FILE||"./data/inbound.json");
const host=process.env.HOST||"127.0.0.1",port=Number(process.env.PORT||4173);
const adminToken=process.env.ADMIN_API_TOKEN||"",websiteKey=process.env.WEBSITE_API_KEY||"";
const verifyToken=process.env.META_VERIFY_TOKEN||"",metaSecret=process.env.META_APP_SECRET||"";
const limit=128*1024;
const mimetype={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml"};
let data={counter:0,inbound:[]};
try {const old=JSON.parse(await readFile(dataFile,"utf8"));if(Array.isArray(old.inbound)&&Number.isInteger(old.counter))data=old}catch(e){if(e.code!=="ENOENT")throw e}
let lock=Promise.resolve();
function serialized(fn){const next=lock.then(fn);lock=next.catch(()=>{});return next}
async function persist(){await mkdir(dirname(dataFile),{recursive:true});const tmp=dataFile+"."+randomUUID()+".tmp";await writeFile(tmp,JSON.stringify(data,null,2),{mode:0o600});await rename(tmp,dataFile)}
function equal(a,b){const x=Buffer.from(String(a||"")),y=Buffer.from(String(b||""));return x.length===y.length&&x.length>0&&timingSafeEqual(x,y)}
function send(res,status,json){res.writeHead(status,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});res.end(JSON.stringify(json))}
async function rawBody(req){let buffers=[],size=0;for await(const part of req){size+=part.length;if(size>limit)throw Object.assign(new Error("Payload too large"),{status:413});buffers.push(part)}return Buffer.concat(buffers)}
async function handler(req,res){
 try{
  const url=new URL(req.url,"http://localhost"),path=url.pathname;
  if(path==="/api/health"){send(res,200,{ok:true,service:"jbfms-inbound"});return}
  if(path==="/api/meta/webhook"&&req.method==="GET"){
    const mode=url.searchParams.get("hub.mode"),token=url.searchParams.get("hub.verify_token"),challenge=url.searchParams.get("hub.challenge");
    if(mode==="subscribe"&&equal(token,verifyToken)&&challenge!==null){res.writeHead(200,{"Content-Type":"text/plain"});res.end(challenge);return}
    send(res,403,{error:"Verification failed"});return
  }
  if(path==="/api/meta/webhook"&&req.method==="POST"){
    if(!metaSecret){send(res,503,{error:"Meta integration is not configured"});return}
    const raw=await rawBody(req);
    if(!verifyMetaSignature(raw,req.headers["x-hub-signature-256"],metaSecret)){send(res,401,{error:"Invalid webhook signature"});return}
    const items=parseMeta(JSON.parse(raw.toString("utf8")));
    const added=await serialized(async()=>{const n=addInbound(data,items);if(n)await persist();return n});
    send(res,200,{received:true,added});return
  }
  if(path==="/api/intake/website"&&req.method==="POST"){
    if(!websiteKey){send(res,503,{error:"Website intake is not configured"});return}
    if(!equal(req.headers["x-api-key"],websiteKey)){send(res,401,{error:"Unauthorized"});return}
    const raw=await rawBody(req),items=parseWebsite(JSON.parse(raw.toString("utf8")));
    const added=await serialized(async()=>{const n=addInbound(data,items);if(n)await persist();return n});
    send(res,202,{received:true,added});return
  }
  if(path.startsWith("/api/")){
    if(!adminToken){send(res,503,{error:"Admin inbox API is not configured"});return}
    if(!equal(req.headers.authorization,"Bearer "+adminToken)){send(res,401,{error:"Unauthorized"});return}
    if(path==="/api/inbound"&&req.method==="GET"){
      send(res,200,{items:data.inbound.map(({id,source,externalId,customerName,phone,email,externalUserId,text,service,address,date,time,package:pkg,status,ready,receivedAt})=>({id,source,externalId,customerName,phone,email,externalUserId,text,service,address,date,time,package:pkg,status,ready,receivedAt}))});return
    }
    const match=path.match(/^\/api\/inbound\/(IN-\d{6,})$/);
    if(match&&req.method==="PATCH"){
      const raw=await rawBody(req),input=JSON.parse(raw.toString("utf8")),status=input.status;
      if(!["New","Reviewing","Converted","Closed"].includes(status)){send(res,422,{error:"Invalid status"});return}
      const result=await serialized(async()=>{const item=data.inbound.find(x=>x.id===match[1]);if(!item)return null;item.status=status;await persist();return item});
      if(!result){send(res,404,{error:"Not found"});return}
      send(res,200,{ok:true,id:result.id,status:result.status});return
    }
    send(res,404,{error:"Unknown API route"});return
  }
  if(req.method!=="GET"&&req.method!=="HEAD"){send(res,405,{error:"Method not allowed"});return}
  let relative=path==="/"?"/index.html":path;
  let full=resolve(root,"."+relative);
  if(!(full===root||full.startsWith(root+sep))||relative.includes("\\")||relative.startsWith("/data/")||relative.startsWith("/server/")||relative.startsWith("/.git")||relative.startsWith("/.env")||relative==="/package.json"){send(res,404,{error:"Not found"});return}
  try{const file=await readFile(full);res.writeHead(200,{"Content-Type":mimetype[extname(full)]||"application/octet-stream","X-Content-Type-Options":"nosniff"});res.end(req.method==="HEAD"?undefined:file)}catch{send(res,404,{error:"Not found"})}
 }catch(err){const status=err.status|| (err instanceof SyntaxError?400:500);if(status===500)console.error("Server request failed:",err);send(res,status,{error:status===500?"Internal server error":err.message})}
}
const server=http.createServer(handler);
server.listen(port,host,()=>console.log("JBFMS CRM: http://"+host+":"+port));
