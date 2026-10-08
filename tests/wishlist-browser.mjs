// Run against a local production preview. API fixtures exercise the recipient UI;
// authorization, atomic claims and clocks are covered by the real PostgreSQL suite.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
const require = createRequire(process.env.JEWEL_BROWSER_RUNTIME ? path.join(process.env.JEWEL_BROWSER_RUNTIME,'../package.json') : import.meta.url);
const {chromium} = require('playwright');
const browser = await chromium.launch({executablePath:process.env.JEWEL_CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
let claims=0,unavailable=false,deadline=Date.now()+60000;
const context = await browser.newContext({viewport:{width:390,height:844}});
const page = await context.newPage();
const telemetry=[];
await context.route('**/*.ingest.*.sentry.io/**',route => {telemetry.push(route.request().url());return route.abort();});
const errors=[];page.on('pageerror',error => errors.push(error.message));
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
await context.route('**/api/shared-wishlist**',route => {
  const url=new URL(route.request().url());
  const headers={'Cache-Control':'no-store','Content-Type':'application/json'};
  if (url.pathname.endsWith('/bootstrap')) return route.fulfill({json:{ok:true},headers});
  if (url.pathname.endsWith('/claim')) {claims++;return route.fulfill({json:{ok:true,share_id:id},headers});}
  if (unavailable) return route.fulfill({status:410,json:{message:'This wishlist is no longer available.'},headers});
  return route.fulfill({headers,json:{ok:true,store_name:'Jewellery Studio',title:'A wishlist for you',expires_at:new Date(deadline).toISOString(),server_now:new Date().toISOString(),products:[{id:'design',title:'Temple Necklace',net_weight:20}]}});
});
try {
  const response=await page.goto(`${process.env.JEWEL_PREVIEW ?? 'http://localhost:3100'}/share/wishlist#${'b'.repeat(64)}`);
  assert.equal(response.status(),200);
  assert.match(response.headers()['cache-control'],/no-store/);
  assert.match(response.headers()['x-robots-tag'],/noindex/);
  await page.getByRole('button',{name:'Open wishlist',exact:true}).waitFor();
  assert.equal(claims,0);
  await page.screenshot({path:'/private/tmp/jewel-wishlist-landing.png'});
  await page.getByRole('button',{name:'Open wishlist',exact:true}).click();
  await page.getByRole('heading',{name:'Temple Necklace'}).waitFor();
  assert.equal(claims,1);assert.equal(new URL(page.url()).hash,'');
  await page.screenshot({path:'/private/tmp/jewel-wishlist-session.png'});
  await page.reload();await page.getByRole('heading',{name:'Temple Necklace'}).waitFor();assert.equal(claims,1);
  unavailable=true;
  await page.reload();await page.getByRole('alert').filter({hasText:'This wishlist is no longer available.'}).waitFor();assert.equal(await page.getByRole('heading',{name:'Temple Necklace'}).count(),0);
  await page.getByRole('button',{name:'Check access again'}).click();assert.equal(claims,1);
  unavailable=false;deadline=Date.now()+1500;
  await page.getByRole('button',{name:'Check access again'}).click();
  await page.getByRole('heading',{name:'Temple Necklace'}).waitFor();
  await page.getByRole('alert').filter({hasText:'Your viewing session has ended'}).waitFor();
  assert.equal(await page.getByRole('heading',{name:'Temple Necklace'}).count(),0);
  const cachedPrivateURLs = await page.evaluate(async () => {
    const urls = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) if (/^\/share\/|^\/api\/shared-wishlist/.test(new URL(request.url).pathname)) urls.push(request.url);
    }
    return urls;
  });
  assert.deepEqual(cachedPrivateURLs,[]);
  assert.deepEqual(errors,[]);
  assert.deepEqual(telemetry,[]);
  console.log('PASS public page loads without sign-in and sets no-store/noindex headers');
  console.log('PASS previews consume no slot; explicit admission consumes one');
  console.log('PASS reload reuses the session; successful admission removes the token fragment');
  console.log('PASS revocation and local expiry remove all wishlist content');
  console.log('PASS mobile recipient views render without browser errors');
} finally {await browser.close();}
