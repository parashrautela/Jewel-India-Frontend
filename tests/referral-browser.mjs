// Actual invitation component, local Vite preview, fixture API responses.
// Database accounting, authorization and concurrency are verified separately with PostgreSQL.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const web=path.join(root,'Jewel-India-Frontend');
const require=createRequire(process.env.JEWEL_BROWSER_RUNTIME?path.join(process.env.JEWEL_BROWSER_RUNTIME,'../package.json'):import.meta.url);
const {chromium}=require('playwright');
const {createServer}=await import(pathToFileURL(path.join(root,'Admin-Panel-for-jewel-India-/node_modules/vite/dist/node/index.js')));
const fixture=await mkdtemp('/private/tmp/jewel-invitation-ui-');
await writeFile(path.join(fixture,'index.html'),`<html><head><style>@font-face{font-family:Cirka;src:url('/fonts/TTF/Cirka-Bold.woff2');font-weight:700}@font-face{font-family:Manrope;src:url('/fonts/TTF/Manrope-Medium.ttf')}*{box-sizing:border-box}body{margin:0;padding:16px;--font-cirka:Cirka;--font-manrope:Manrope;font-family:Manrope}button,input{font:inherit}</style></head><body><div id="root"></div><script type="module" src="/main.jsx"></script></body></html>`);
await writeFile(path.join(fixture,'main.jsx'),`import React from 'react';import {createRoot} from 'react-dom/client';import ReferralManager from ${JSON.stringify(path.join(web,'components/wholesaler/referral/ReferralManager.jsx'))};createRoot(document.getElementById('root')).render(<ReferralManager home accountId="ui-test"/>);`);
await writeFile(path.join(fixture,'link.jsx'),`import React from 'react';export default function Link({href,children,...props}){return <a href={href} {...props}>{children}</a>;}`);
await writeFile(path.join(fixture,'credits.jsx'),`export function useCredits(){return {refresh:async()=>{}};}`);
const server=await createServer({configFile:false,root:fixture,publicDir:path.join(web,'public'),optimizeDeps:{include:['react','react-dom/client','react/jsx-runtime','react/jsx-dev-runtime']},resolve:{alias:[{find:'next/link',replacement:path.join(fixture,'link.jsx')},{find:'../../../context/CreditsContext',replacement:path.join(fixture,'credits.jsx')},{find:'react',replacement:path.join(web,'node_modules/react')},{find:'react-dom',replacement:path.join(web,'node_modules/react-dom')}]},esbuild:{jsx:'automatic'},server:{host:'127.0.0.1',port:0,fs:{allow:[root,fixture]}}});
await server.listen();const port=server.httpServer.address().port;
const browser=await chromium.launch({executablePath:process.env.JEWEL_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--disable-gpu']});
const context=await browser.newContext({viewport:{width:393,height:852},permissions:['clipboard-read','clipboard-write']});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
let skip=false;let generated=null;let unavailable=false;const intents=[];
const settings=()=>({ok:true,enabled:true,skip_guide:skip,available:2000,minimum:1000,step:500,maximum:10000,reward:1000,links:generated?[generated]:[],count:generated?1:0});
await context.route('**/api/referral/manage**',async route=>{
 if(unavailable)return route.fulfill({status:404,contentType:'text/html',body:'<html>Not found</html>'});
 const req=route.request();if(req.method()==='POST')skip=req.postDataJSON().skip_guide;
 if(req.method()==='DELETE'){generated=null;return route.fulfill({json:{ok:true,refunded:500}});}
 return route.fulfill({json:settings(),headers:{'Cache-Control':'no-store'}});
});
await context.route('**/api/referral/generate',async route=>{
 const body=route.request().postDataJSON();intents.push(body);
 generated={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',code:'JI-TESTCODE',link:'https://example.com/join/JI-TESTCODE',gift_credits:body.gift_credits,extra_credits:body.gift_credits-1000,generation_key:body.idempotency_key,status:'unclaimed',policy_version:1,created_at:new Date().toISOString(),expires_at:new Date(Date.now()+604800000).toISOString()};
 if(intents.length===1)return route.abort('failed');
 return route.fulfill({json:generated});
});
try {
 await page.goto(`http://127.0.0.1:${port}`);await page.getByRole('button',{name:/Invite retailers/}).waitFor();
 unavailable=true;
 await page.getByRole('button',{name:/Invite retailers/}).click();
 await page.getByRole('heading',{name:'How it works'}).waitFor();
 await page.getByRole('alert').filter({hasText:'service hasn’t been updated'}).waitFor();
 assert.equal(await page.getByRole('checkbox').isChecked(),true);assert.equal(intents.length,0);
 await page.getByRole('checkbox').uncheck();await page.getByRole('button',{name:'Invite a retailer',exact:true}).click();
 await page.getByRole('button',{name:'Retry invitation service'}).waitFor();
 assert.equal(skip,false);assert.equal(intents.length,0);
 unavailable=false;await page.getByRole('button',{name:'Retry invitation service'}).click();
 await page.getByRole('button',{name:'Invite a retailer',exact:true}).waitFor();
 await page.getByRole('button',{name:'Close invitation'}).click();
 console.log('PASS first-time guide survives an HTML 404, preference is not falsely saved, and retry recovers');
 await page.screenshot({timeout:5000,animations:'disabled',path:'/tmp/invitation-web-card.png'}).catch(()=>{});
 await page.getByRole('button',{name:/Invite retailers/}).click();await page.getByRole('heading',{name:'How it works'}).waitFor();
 assert.equal(intents.length,0);assert.equal(await page.getByRole('checkbox').isChecked(),true);
 await page.screenshot({timeout:5000,animations:'disabled',path:'/tmp/invitation-web-guide.png'}).catch(()=>{});
 await page.getByRole('checkbox').uncheck();await page.getByRole('button',{name:'Invite a retailer',exact:true}).click();
 assert.equal(skip,false);await page.getByRole('button',{name:'Increase gift'}).click();
 assert.equal(await page.getByRole('status').count(),1); // output uses its implicit status role
 await page.screenshot({timeout:5000,animations:'disabled',path:'/tmp/invitation-web-gift.png'}).catch(()=>{});
 await page.getByRole('button',{name:'Generate invitation link'}).click();await page.getByRole('button',{name:'Retry invitation'}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Increase gift'}).isDisabled(),true);
 await page.getByRole('button',{name:'Retry invitation'}).click();await page.getByRole('heading',{name:'Your invitation is ready'}).waitFor();
 assert.equal(intents.length,2);assert.deepEqual(intents[0],intents[1]);assert.equal(generated.gift_credits,1500);
 await page.getByRole('button',{name:'Copy invitation link'}).click();await page.getByRole('button',{name:'Copied!'}).waitFor();
 assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),generated.link);
 await page.screenshot({timeout:5000,animations:'disabled',path:'/tmp/invitation-web-ready.png'}).catch(()=>{});
 await page.getByRole('button',{name:'Close invitation'}).click();await page.getByRole('button',{name:/Invite retailers/}).click();
 await page.getByRole('heading',{name:'How it works'}).waitFor();assert.equal(await page.getByRole('checkbox').isChecked(),true);
 await page.getByRole('button',{name:'Invite a retailer',exact:true}).click();assert.equal(skip,true);
 await page.getByRole('button',{name:'Close invitation'}).click();await page.getByRole('button',{name:/Invite retailers/}).click();
 await page.getByRole('heading',{name:'Your invitation is ready'}).waitFor();assert.equal(await page.getByRole('heading',{name:'How it works'}).count(),0);
 const broken=await page.locator('dialog img').evaluateAll(images=>images.filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src));assert.deepEqual(broken,[]);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);
 console.log('PASS mobile card, default checked guide, saved preference, explicit generation, retry key, immutable pending gift, copy and local artwork');
}catch(error){console.log('Browser errors',errors);throw error;}finally{await browser.close();await server.close();await rm(fixture,{recursive:true,force:true});}
