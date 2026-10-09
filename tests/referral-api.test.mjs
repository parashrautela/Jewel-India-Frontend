import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const actor='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',key='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
async function fixture({signedIn=true,result={ok:true,id:'invite',code:'JI-TEST',gift_credits:1500,extra_credits:500},rpcError=false}={}) {
 const calls=[];
 const context=vm.createContext({Response,URL,console,process:{env:{NEXT_PUBLIC_SITE_URL:'https://example.com'}}});
 const userModule=new vm.SyntheticModule(['getRequestUser'],function(){this.setExport('getRequestUser',async()=>({user:signedIn?{id:actor}:null}));},{context});
 const dbModule=new vm.SyntheticModule(['supabaseAdmin'],function(){this.setExport('supabaseAdmin',{rpc:async(name,args)=>{calls.push({name,args});return {data:name==='referral_expire_due'?0:result,error:rpcError?{message:'DB unavailable'}:null};}});},{context});
 const nextModule=new vm.SyntheticModule(['NextResponse'],function(){this.setExport('NextResponse',{json:(data,options)=>new Response(JSON.stringify(data),{...options,headers:{'Content-Type':'application/json',...options?.headers}})});},{context});
 const cryptoModule=new vm.SyntheticModule(['randomUUID'],function(){this.setExport('randomUUID',()=>key);},{context});
 const helper=new vm.SourceTextModule(await readFile(new URL('../lib/supabase/referral-api.js',import.meta.url),'utf8'),{context});
 await helper.link(spec=>spec==='next/server'?nextModule:userModule);
 const module=new vm.SourceTextModule(await readFile(new URL('../app/api/referral/generate/route.js',import.meta.url),'utf8'),{context});
 await module.link(spec=>spec==='node:crypto'?cryptoModule:spec.includes('referral-api')?helper:dbModule);await module.evaluate();
 return {calls,post:async body=>module.namespace.POST({json:async()=>body})};
}
test('authentication precedes every accounting call',async()=>{const f=await fixture({signedIn:false});assert.equal((await f.post({})).status,401);assert.equal(f.calls.length,0);});
test('trusted actor and gift price are derived server-side',async()=>{const f=await fixture();const r=await f.post({gift_credits:1500,idempotency_key:key,source:'ios',user_id:'attacker',extra_credits:0});assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.deepEqual(JSON.parse(JSON.stringify(f.calls[1])),{name:'referral_generate',args:{p_user:actor,p_gift:1500,p_key:key,p_source:'ios'}});assert.equal((await r.json()).link,'https://example.com/join/JI-TEST');});
test('invalid bodies, fractional gifts and malformed idempotency keys cannot reach accounting',async()=>{for(const body of [null,[],true,'text',{gift_credits:1500.5,idempotency_key:key},{gift_credits:1500,idempotency_key:'bad'},{gift_credits:1500,idempotency_key:key,source:'attacker'}]){const f=await fixture();assert.equal((await f.post(body)).status,400);assert.equal(f.calls.length,0);}});
test('the default gift remains compatible with older callers',async()=>{const f=await fixture();await f.post({source:'ios'});assert.equal(f.calls[1].args.p_gift,1000);assert.equal(f.calls[1].args.p_key,key);});
test('paused and insufficient-credit refusals are not successes',async()=>{for(const error of ['REFERRALS_PAUSED','INSUFFICIENT_CREDITS']){const f=await fixture({result:{ok:false,error,balance:100}});const r=await f.post({});assert.equal(r.status,409);assert.equal((await r.json()).code,error);}});
test('database outages fail closed without generation',async()=>{const f=await fixture({rpcError:true});assert.equal((await f.post({})).status,503);assert.equal(f.calls.length,1);});
