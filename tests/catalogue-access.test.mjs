import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

async function fixture({role='retailer',signedIn=true,verified=true,published=true}={}) {
  const calls=[];
  const context=vm.createContext({Response,console});
  const userModule=new vm.SyntheticModule(['getRequestUser'],function(){this.setExport('getRequestUser',async()=>({user:signedIn?{id:'trusted-user',user_metadata:{role}}:null}));},{context});
  function query(table) {
    const call={table,filters:[],mutation:null};calls.push(call);
    const builder={
      select(columns){call.columns=columns;return this;},
      eq(column,value){call.filters.push([column,value]);return this;},
      order(){return this;},
      limit(){return this;},
      in(column,value){call.filters.push([column,value]);return this;},
      insert(value){call.mutation={insert:value};return this;},
      delete(){call.mutation={delete:true};return this;},
      single(){return Promise.resolve(result());},
      maybeSingle(){return Promise.resolve(result());},
      then(resolve,reject){return Promise.resolve(result()).then(resolve,reject);},
    };
    function result() {
      if(table==='retailers') return {data:{id:'trusted-retailer',verification_status:verified?'verified':'pending'},error:null};
      if(table==='products') return {data:call.columns==='id'?(published?{id:'visible-product'}:null):[{id:'visible-product'}],error:null};
      return {data:call.mutation?{id:'selection'}:[{product_id:'visible-product'}],error:null};
    }
    return builder;
  }
  const dbModule=new vm.SyntheticModule(['supabaseAdmin'],function(){this.setExport('supabaseAdmin',{from:query});},{context});
  const nextModule=new vm.SyntheticModule(['NextResponse'],function(){this.setExport('NextResponse',{json:(data,options)=>new Response(JSON.stringify(data),{...options,headers:{'Content-Type':'application/json',...options?.headers}})});},{context});
  async function load(file) {
    const module=new vm.SourceTextModule(await readFile(new URL(file,import.meta.url),'utf8'),{context});
    await module.link(spec=>spec==='next/server'?nextModule:spec.includes('request-user')?userModule:dbModule);
    await module.evaluate();return module.namespace;
  }
  return {calls,get:(await load('../app/api/retailer/marketplace/route.js')).GET,post:(await load('../app/api/retailer/your-taste/route.js')).POST};
}
const body={product_id:'visible-product',selected:true,retailer_id:'attacker'};
test('marketplace and selection deny anonymous and non-retailer callers before DB access',async()=>{
 for(const options of [{signedIn:false},{role:'employee'},{role:'wholesaler'}]) {
  const f=await fixture(options);const expected=options.signedIn===false?401:403;
  assert.equal((await f.get({})).status,expected);
  assert.equal((await f.post({json:async()=>body})).status,expected);
  assert.equal(f.calls.length,0);
 }
});
test('unverified retailer cannot read pool or change employee selections',async()=>{
 const f=await fixture({verified:false});assert.equal((await f.get({})).status,403);
 assert.equal((await f.post({json:async()=>body})).status,403);
 assert.equal(f.calls.some(x=>x.table==='products'||x.table==='retailer_selections'),false);
});
test('catalogue uses published products and trusted retailer selection scope, with no-store',async()=>{
 const f=await fixture();const response=await f.get({});assert.equal(response.status,200);
 assert.match(response.headers.get('cache-control'),/no-store/);
 assert.deepEqual(f.calls.find(x=>x.table==='products').filters,[['is_published',true]]);
 assert.deepEqual(f.calls.find(x=>x.table==='retailer_selections').filters,[['retailer_id','trusted-retailer']]);
});
test('hidden/unavailable product cannot be newly selected',async()=>{
 const f=await fixture({published:false});assert.equal((await f.post({json:async()=>body})).status,404);
 assert.equal(f.calls.some(x=>x.mutation),false);
});
test('selection derives retailer ownership server-side and checks publication',async()=>{
 const f=await fixture();assert.equal((await f.post({json:async()=>body})).status,200);
 assert.deepEqual(f.calls.find(x=>x.table==='products').filters,[['id','visible-product'],['is_published',true]]);
 assert.equal(f.calls.find(x=>x.mutation).mutation.insert.retailer_id,'trusted-retailer');
});
