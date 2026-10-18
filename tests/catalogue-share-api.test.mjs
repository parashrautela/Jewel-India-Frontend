import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import * as nodeCrypto from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {CATALOGUE_LINK, CATALOGUE_MESSAGES, SHARE_MESSAGES, catalogueShareProblem} from '../lib/wishlist/contract.mjs';
import {filterWishlistTelemetry} from '../lib/wishlist/telemetry.mjs';

// Contract: plans/catalogue-sharing/CONTRACT.md (v1).
const actor='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const p1='11111111-1111-4111-8111-111111111111',p2='22222222-2222-4222-8222-222222222222';
const shareId='33333333-3333-4333-8333-333333333333';
const body={product_ids:[p1,p2],max_viewers:3,duration_minutes:1440,title:'For Sharma Jewellers'};
const source=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

async function fixture({signedIn=true,verified=true,rateOk=true,result,rpcError=false}={}) {
 const calls=[];
 const context=vm.createContext({Response,URL,console,process:{env:{SUPABASE_SERVICE_ROLE_KEY:'test'}}});
 const synthetic=(names,values)=>new vm.SyntheticModule(names,function(){for(const n of names)this.setExport(n,values[n]);},{context});
 const rpc=async(name,args)=>{calls.push({name,args});
  if(rpcError)return {data:null,error:{code:'XX000'}};
  const data=name==='catalogue_share_actor'?verified:name==='wishlist_share_rate_limit'?rateOk
   :name==='catalogue_share_create'?(result??{ok:true,id:shareId,title:'For Sharma Jewellers',item_count:2,max_viewers:3,views_used:0,expires_at:'2026-10-19T10:00:00Z'})
   :name==='catalogue_share_list'?[{id:shareId,title:'x',item_count:2,max_viewers:3,views_used:1,created_at:'c',expires_at:'e',revoked_at:null}]
   :name==='catalogue_share_revoke'?(result??{ok:true}):null;
  return {data,error:null};};
 const modules={
  'server-only':synthetic(['default'],{default:undefined}),
  'node:crypto':synthetic(['createHash','createHmac','randomBytes'],nodeCrypto),
  'next/server':synthetic(['NextResponse'],{NextResponse:{json:(data,options)=>new Response(JSON.stringify(data),{...options,headers:{'Content-Type':'application/json',...options?.headers}})}}),
  admin:synthetic(['supabaseAdmin'],{supabaseAdmin:{rpc}}),
  user:synthetic(['getRequestUser'],{getRequestUser:async()=>({user:signedIn?{id:actor}:null,error:null})}),
 };
 const contract=new vm.SourceTextModule(await source('lib/wishlist/contract.mjs'),{context});
 await contract.link(()=>{throw new Error('contract has no imports');});
 const server=new vm.SourceTextModule(await source('lib/wishlist/server.js'),{context});
 await server.link(spec=>modules[spec]??(spec.includes('admin')?modules.admin:spec.includes('request-user')?modules.user:contract));
 const load=async path=>{const m=new vm.SourceTextModule(await source(path),{context});
  await m.link(spec=>spec.includes('server.js')?server:contract);await m.evaluate();return m.namespace;};
 const list=await load('app/api/catalogue-shares/route.js');
 const revoke=await load('app/api/catalogue-shares/[id]/revoke/route.js');
 const req=({json=body,bearer=true,origin=null,url='https://example.com/api/catalogue-shares'}={})=>({
  url,headers:{get:h=>h==='authorization'?(bearer?'Bearer token':null):h==='origin'?origin:null},
  json:async()=>{if(json==='BAD_JSON')throw vm.runInContext('new SyntaxError("bad json")',context);return json;}});
 return {calls,
  post:opts=>list.POST(req(opts)),
  get:opts=>list.GET(req(opts)),
  revoke:(id,opts)=>revoke.POST(req(opts),{params:Promise.resolve({id})})};
}
const names=calls=>calls.map(c=>c.name);
const plain=value=>JSON.parse(JSON.stringify(value));

test('selection and settings are validated separately',()=>{
 assert.equal(catalogueShareProblem(body),null);
 assert.equal(catalogueShareProblem({...body,title:undefined}),null);
 for(const ids of [[],[p1,p1],[p1,p1.toUpperCase()],['nope'],[p1,null],'x',Array.from({length:51},(_, i)=>`${String(i).padStart(8,'0')}-1111-4111-8111-111111111111`)])
  assert.equal(catalogueShareProblem({...body,product_ids:ids}),'INVALID_SELECTION',JSON.stringify(ids).slice(0,40));
 for(const patch of [{max_viewers:0},{max_viewers:101},{max_viewers:1.5},{max_viewers:'2'},{duration_minutes:4},{duration_minutes:10081},{title:5},{title:'x'.repeat(501)}])
  assert.equal(catalogueShareProblem({...body,...patch}),'INVALID_SETTINGS');
 for(const bad of [null,[],'x',true])assert.equal(catalogueShareProblem(bad),'INVALID_SETTINGS');
 assert.equal(catalogueShareProblem({...body,product_ids:Array.from({length:50},(_, i)=>`${String(i).padStart(8,'0')}-1111-4111-8111-111111111111`)}),null,'50 is allowed');
});

test('only well-formed catalogue links are accepted, and they never reach telemetry',()=>{
 assert(CATALOGUE_LINK.test(`/share/catalogue#${'a'.repeat(64)}`));
 for(const bad of [`/share/catalogue#${'A'.repeat(64)}`,`/share/catalogue#${'a'.repeat(63)}`,`/share/wishlist#${'a'.repeat(64)}`,`https://x/share/catalogue#${'a'.repeat(64)}`])assert(!CATALOGUE_LINK.test(bad));
 for(const value of [{request:{url:`https://app.jewelindia.shop/share/catalogue#${'a'.repeat(64)}`}},{data:{url:'/api/catalogue-shares'}},{message:'POST /api/catalogue-shares/x/revoke failed'}])assert.equal(filterWishlistTelemetry(value),null);
});

test('wishlist messages are unchanged apart from a clearer sign-in prompt',()=>{
 assert.equal(SHARE_MESSAGES.NOT_VERIFIED,'A verified store and active account are required.');
 assert.equal(SHARE_MESSAGES.UNAVAILABLE,'This wishlist is no longer available.');
 assert.equal(CATALOGUE_MESSAGES.NOT_VERIFIED,'Sharing is available once your wholesaler account is verified.');
 assert.equal(CATALOGUE_MESSAGES.INVALID_SELECTION,'Select 1–50 of your published designs.');
});

test('authentication and verification come before any share is created',async()=>{
 let f=await fixture({signedIn:false});let r=await f.post();
 assert.equal(r.status,401);assert.equal((await r.json()).message,'Please sign in again to share designs.');assert.deepEqual(names(f.calls),[]);
 f=await fixture({verified:false});r=await f.post();
 assert.equal(r.status,403);assert.equal((await r.json()).error,'NOT_VERIFIED');assert.deepEqual(names(f.calls),['catalogue_share_actor']);
});

test('creating a link derives the owner server-side and returns the secret only in the fragment',async()=>{
 const f=await fixture();const r=await f.post({json:{...body,user_id:'attacker',p_actor:'attacker'}});
 assert.equal(r.status,201);assert.equal(r.headers.get('cache-control'),'private, no-store, max-age=0');
 const data=await r.json();assert(CATALOGUE_LINK.test(data.link_path));assert.equal(data.item_count,2);
 assert.deepEqual(names(f.calls),['catalogue_share_actor','wishlist_share_rate_limit','catalogue_share_create']);
 assert.equal(f.calls[1].args.p_bucket,`catalogue-creator:${actor}`);
 const args=f.calls[2].args;const token=data.link_path.split('#')[1];
 assert.equal(args.p_actor,actor);assert.deepEqual([...args.p_products],[p1,p2]);assert.equal(args.p_title,'For Sharma Jewellers');
 assert.equal(args.p_max_viewers,3);assert.equal(args.p_duration_minutes,1440);
 assert.equal(args.p_token_hash,nodeCrypto.createHash('sha256').update(token).digest('hex'),'only the hash is stored');
 assert.notEqual(args.p_token_hash,token);
});

test('bad requests never reach the rate limiter or the database write',async()=>{
 for(const [json,code] of [[{...body,product_ids:[]},'INVALID_SELECTION'],[{...body,max_viewers:0},'INVALID_SETTINGS'],['BAD_JSON','INVALID_SETTINGS']]){
  const f=await fixture();const r=await f.post({json});assert.equal(r.status,400);assert.equal((await r.json()).error,code);
  assert.deepEqual(names(f.calls),['catalogue_share_actor']);}
});

test('refusals map to the contract statuses and messages',async()=>{
 let f=await fixture({rateOk:false});let r=await f.post();assert.equal(r.status,429);assert.equal((await r.json()).error,'RATE_LIMITED');
 for(const [error,status] of [['INVALID_SELECTION',400],['TOO_MANY_LINKS',400],['NOT_VERIFIED',403]]){
  f=await fixture({result:{ok:false,error}});r=await f.post();const data=await r.json();
  assert.equal(r.status,status);assert.equal(data.error,error);assert.equal(data.message,CATALOGUE_MESSAGES[error]);assert.equal(data.link_path,undefined);}
 f=await fixture({rpcError:true});r=await f.post();assert.equal(r.status,503);assert.equal((await r.json()).message,'Sharing is temporarily unavailable. Please try again.');
});

test('cookie requests from another origin are refused before anything else',async()=>{
 const f=await fixture();const r=await f.post({bearer:false,origin:'https://evil.example'});
 assert.equal(r.status,403);assert.deepEqual(names(f.calls),[]);
});

test('listing returns the caller own links without secrets',async()=>{
 const f=await fixture();const r=await f.get();const data=await r.json();
 assert.equal(r.status,200);assert.equal(data.shares.length,1);assert.equal(data.shares[0].link_path,undefined);assert.ok(data.server_now);
 assert.deepEqual(plain(f.calls.at(-1)),{name:'catalogue_share_list',args:{p_actor:actor}});
 const out=await fixture({verified:false});assert.equal((await out.get()).status,403);
});

test('revoking is owner-checked in the database and idempotent',async()=>{
 let f=await fixture();let r=await f.revoke(shareId);assert.equal(r.status,200);assert.deepEqual(plain(await r.json()),{ok:true});
 assert.deepEqual(plain(f.calls.at(-1)),{name:'catalogue_share_revoke',args:{p_actor:actor,p_share:shareId}});
 f=await fixture();r=await f.revoke('not-a-uuid');assert.equal(r.status,404);assert.deepEqual(names(f.calls),['catalogue_share_actor']);
 f=await fixture({result:{ok:false,error:'NOT_FOUND'}});r=await f.revoke(shareId);assert.equal(r.status,404);assert.equal((await r.json()).message,'Link not found.');
 f=await fixture();r=await f.revoke(shareId,{bearer:false,origin:'https://evil.example'});assert.equal(r.status,403);
});
