import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { catalogueImages, cataloguePhotos } from '../lib/wishlist/catalogue-images.mjs';
import { UUID, TOKEN } from '../lib/wishlist/contract.mjs';

const url = name => `https://images.test/${name}.jpg`;
const products = Array.from({ length: 5 }, (_, i) => ({
  id: `design-${i}`, title: `Design ${i}`,
  showcase_image_urls: [url(`${i}-a`), url(`${i}-b`), url(`${i}-c`)],
  image_variants: { [url(`${i}-a`)]: { card: url(`${i}-card`), detail: url(`${i}-detail`) } },
}));

test('5 designs with 3 photos produce 15 distinct ordered viewer/grid entries', () => {
  const photos = cataloguePhotos(products.map(p => ({ id: p.id, title: p.title, images: catalogueImages(p) })));
  assert.equal(photos.length, 15);
  assert.equal(new Set(photos.map(p => p.id)).size, 15);
  assert.deepEqual(photos.map(p => p.title), products.flatMap(p => Array(3).fill(p.title)));
  assert.equal(photos[0].image_url, url('0-card'));
  assert.equal(photos[0].full_image_url, url('0-detail'));
  assert.equal(photos[1].full_image_url, url('0-b'));
});

test('published showcase order wins over unused source photos; duplicates and unsafe URLs are rejected', () => {
  const row = { showcase_image_urls: [url('b'), url('a'), url('b'), '', 'http://unsafe.test/a', 'javascript:alert(1)'], generated_image_urls: [url('private-source')] };
  assert.deepEqual(catalogueImages(row).map(p => p.image_url), [url('b'), url('a')]);
  const fallback = catalogueImages({ generated_image_urls: [url('a'), url('b')], processed_image_url: url('a'), image_url: url('c'), custom_image_urls: [url('d')] });
  assert.deepEqual(fallback.map(p => p.image_url), ['a', 'b', 'c', 'd'].map(url));
});

test('invalid derivative URLs fall back to originals, and legacy single-photo payloads still work', () => {
  assert.deepEqual(catalogueImages({ showcase_image_urls: [url('a')], image_variants: { [url('a')]: { card: 'javascript:bad', full: url('full') } } }), [{ image_url: url('a'), full_image_url: url('full') }]);
  const legacy = { id: 'old', title: 'Old design', image_url: url('a'), full_image_url: url('full') };
  assert.equal(cataloguePhotos([legacy])[0].full_image_url, url('full'));
  assert.equal(cataloguePhotos([{ ...legacy, images: [] }]).length, 1);
});

async function fixture({ result, rows = products, queryError = false, cookie = 'a'.repeat(64) } = {}) {
  const calls = [];
  const context = vm.createContext({ URL, Map, Error });
  const synthetic = values => new vm.SyntheticModule(Object.keys(values), function () {
    for (const [name, value] of Object.entries(values)) this.setExport(name, value);
  }, { context });
  const db = { from(table) {
    calls.push(['from', table]);
    return { select(columns) {
      calls.push(['select', columns]);
      return { in(column, ids) {
        calls.push(['in', column, [...ids]]);
        return { eq: async (column, value) => {
          calls.push(['eq', column, value]); return { data: rows, error: queryError ? {} : null };
        } };
      } };
    } };
  } };
  const content = new vm.SourceTextModule(await readFile(new URL('../lib/wishlist/catalogue-content.js', import.meta.url), 'utf8'), { context });
  await content.link(spec => spec === 'server-only' ? synthetic({}) : spec.includes('admin') ? synthetic({ supabaseAdmin: db }) : synthetic({ catalogueImages }));
  const route = new vm.SourceTextModule(await readFile(new URL('../app/api/shared-wishlist/route.js', import.meta.url), 'utf8'), { context });
  await route.link(spec => spec.includes('catalogue-content') ? content : spec.includes('contract') ? synthetic({ UUID, TOKEN }) : synthetic({
    hashToken: value => `hashed:${value}`, sessionCookie: () => 'session',
    rpc: async (name, args) => { calls.push(['rpc', name, args]); return result; },
    resultResponse: value => value,
    failure: (error, status) => ({ ok: false, error, status }),
  }));
  await route.evaluate();
  return { calls, get: () => route.namespace.GET({ url: 'https://site.test/api/shared-wishlist?session=11111111-1111-4111-8111-111111111111', cookies: { get: () => ({ value: cookie }) } }) };
}
const shared = { ok: true, kind: 'catalogue', products: products.map(p => ({ id: p.id, title: p.title, image_url: p.showcase_image_urls[0] })) };

test('guest endpoint authenticates the session before fetching only the admitted, published product IDs', async () => {
  const f = await fixture({ result: shared, rows: [...products].reverse() });
  const response = await f.get();
  assert.equal(f.calls[0][0], 'rpc');
  assert.deepEqual(f.calls.find(c => c[0] === 'in'), ['in', 'id', products.map(p => p.id)]);
  assert.deepEqual(f.calls.find(c => c[0] === 'eq'), ['eq', 'is_published', true]);
  assert.equal(response.products.length, 5);
  assert.equal(cataloguePhotos(response.products).length, 15);
  assert.deepEqual(response.products.map(p => p.id), products.map(p => p.id));
  assert.deepEqual(Object.keys(response.products[0]).sort(), ['id', 'title', 'image_url', 'images'].sort());
  assert(!JSON.stringify(response).includes('showcase_image_urls'));
});

test('expired/revoked/rejected sessions and retailer wishlists never fetch gallery rows', async () => {
  for (const result of [{ ok: false, error: 'EXPIRED' }, { ok: false, error: 'UNAVAILABLE' }, { ok: true, kind: 'wishlist', products: [] }]) {
    const f = await fixture({ result });
    assert.deepEqual(await f.get(), result);
    assert(!f.calls.some(c => c[0] === 'from'));
  }
  const f = await fixture({ cookie: 'invalid' });
  assert.equal((await f.get()).error, 'SESSION_ENDED');
  assert.equal(f.calls.length, 0);
});

test('products removed/unpublished between session validation and fetch disappear; query errors fail closed', async () => {
  let f = await fixture({ result: shared, rows: products.slice(1) });
  assert.equal((await f.get()).products.length, 4);
  f = await fixture({ result: shared, rows: [] });
  assert.equal((await f.get()).error, 'UNAVAILABLE');
  f = await fixture({ result: shared, queryError: true });
  assert.equal((await f.get()).status, 503);
});
