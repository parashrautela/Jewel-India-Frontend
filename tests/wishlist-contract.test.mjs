import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validShareSettings,remainingSessionMs,safeImageUrl,wishlistResponse} from '../lib/wishlist/contract.mjs';
import {filterWishlistTelemetry} from '../lib/wishlist/telemetry.mjs';
test('sharing limits reject fractional values and out-of-range settings',()=> {
 const base={board_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',max_viewers:1,duration_minutes:5};
 assert(validShareSettings(base));
 for (const patch of [{max_viewers:0},{max_viewers:101},{max_viewers:1.5},{max_viewers:'2'},{duration_minutes:4},{duration_minutes:10081},{board_id:'other'}]) assert(!validShareSettings({...base,...patch}));
});
test('session timing uses server duration, regardless of device clock skew',()=> {
 const end='2026-10-01T00:30:00Z',server='2026-10-01T00:00:00Z';
 assert.equal(remainingSessionMs(end,server,1000,2000),1799000);
 assert.equal(remainingSessionMs(end,server,1000,2000000),0);
 assert.equal(remainingSessionMs('invalid',server,0),0);
});
test('unsafe media URLs cannot enter the shared grid',()=> {
 for(const value of ['javascript:alert(1)','data:image/svg+xml,x','http://example.com/image','invalid']) assert.equal(safeImageUrl(value),null);
 assert.equal(safeImageUrl('https://example.com/image'),'https://example.com/image');
});
test('wishlist capabilities and API bodies cannot enter telemetry',()=> {
 for(const value of [{request:{url:'https://app.jewelindia.shop/share/wishlist#secret'}},{request:{url:'https://app.jewelindia.shop/api/shared-wishlist/claim',data:{token:'secret'}}},{data:{url:'/api/wishlist-shares'}},{message:'GET /api/wishlists failed'}]) assert.equal(filterWishlistTelemetry(value),null);
 const regular={request:{url:'/dashboard/wholesaler'}};assert.equal(filterWishlistTelemetry(regular),regular);
});

test('gateway failures show usable messages without raw HTML or parser errors',async()=> {
 await assert.rejects(wishlistResponse(new Response('<html>Not Found</html>', {status:404})), /temporarily unavailable/);
 await assert.rejects(wishlistResponse(Response.json({message:'This wishlist link has expired.'},{status:410})), /has expired/);
 assert.deepEqual(await wishlistResponse(Response.json({ok:true})),{ok:true});
});
