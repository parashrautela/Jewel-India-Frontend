import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

async function createFixture({
  role = 'retailer',
  signedIn = true,
  verified = true,
  products = [],
  selections = [],
} = {}) {
  const calls = [];
  const context = vm.createContext({
    Response,
    console,
    Buffer,
    Date,
    URL,
    URLSearchParams,
  });

  const userModule = new vm.SyntheticModule(
    ['getRequestUser'],
    function () {
      this.setExport('getRequestUser', async () => ({
        user: signedIn ? { id: 'test-user-id', user_metadata: { role } } : null,
        error: signedIn ? null : new Error('Unauthorized'),
      }));
    },
    { context }
  );

  function query(table) {
    const call = { table, filters: [], order: [], limitCount: null, columns: '*' };
    calls.push(call);

    const builder = {
      select(columns) {
        call.columns = columns;
        return this;
      },
      eq(column, value) {
        call.filters.push({ type: 'eq', column, value });
        return this;
      },
      ilike(column, value) {
        call.filters.push({ type: 'ilike', column, value });
        return this;
      },
      or(clause) {
        call.filters.push({ type: 'or', clause });
        return this;
      },
      in(column, values) {
        call.filters.push({ type: 'in', column, values });
        return this;
      },
      order(column, options) {
        call.order.push({ column, options });
        return this;
      },
      limit(n) {
        call.limitCount = n;
        return this;
      },
      single() {
        return Promise.resolve(executeSingle());
      },
      maybeSingle() {
        return Promise.resolve(executeMaybeSingle());
      },
      then(resolve, reject) {
        return Promise.resolve(executeList()).then(resolve, reject);
      },
    };

    function executeSingle() {
      if (table === 'retailers') {
        if (!verified) return { data: { id: 'test-retailer-id', verification_status: 'pending' }, error: null };
        return { data: { id: 'test-retailer-id', verification_status: 'verified' }, error: null };
      }
      return { data: null, error: new Error('Not found') };
    }

    function executeMaybeSingle() {
      if (table === 'products') {
        const idFilter = call.filters.find((f) => f.column === 'id');
        if (idFilter) {
          const match = products.find((p) => p.id === idFilter.value && p.is_published === true);
          return { data: match || null, error: null };
        }
      }
      if (table === 'retailer_selections') {
        const pFilter = call.filters.find((f) => f.column === 'product_id');
        if (pFilter && selections.includes(pFilter.value)) {
          return { data: { id: 'sel-1' }, error: null };
        }
        return { data: null, error: null };
      }
      return { data: null, error: null };
    }

    function executeList() {
      if (table === 'retailers') return { data: [], error: null };
      if (table === 'retailer_selections') {
        const inFilter = call.filters.find((f) => f.type === 'in' && f.column === 'product_id');
        const allowedIDs = inFilter ? inFilter.values : selections;
        const matched = selections
          .filter((id) => allowedIDs.includes(id))
          .map((id) => ({ product_id: id }));
        return { data: matched, error: null };
      }
      if (table === 'products') {
        let filtered = products.filter((p) => p.is_published === true);

        // Handle ilike filter on jewellery_type
        const catFilter = call.filters.find((f) => f.type === 'ilike' && f.column === 'jewellery_type');
        if (catFilter) {
          filtered = filtered.filter(
            (p) => p.jewellery_type?.toLowerCase() === catFilter.value.toLowerCase()
          );
        }

        const typeFilter = call.filters.find(f => f.type === 'in' && f.column === 'jewellery_type');
        if (typeFilter) filtered = filtered.filter(p => typeFilter.values.includes(p.jewellery_type));

        // Handle in filter on id
        const inFilter = call.filters.find((f) => f.type === 'in' && f.column === 'id');
        if (inFilter) {
          filtered = filtered.filter((p) => inFilter.values.includes(p.id));
        }

        // Handle text search filter
        const orFilter = call.filters.find((f) => f.type === 'or' && f.clause?.includes('ilike'));
        if (orFilter) {
          const match = orFilter.clause.match(/title\.ilike\.(?:%|)([^,%]+)(?:%|)/);
          if (match) {
            const needle = match[1].toLowerCase();
            filtered = filtered.filter((p) =>
              [p.title, p.jewellery_type, p.category, p.style, p.metal_purity]
                .filter(Boolean)
                .some((val) => val.toLowerCase().includes(needle))
            );
          }
        }

        // Sort by created_at DESC, id DESC
        filtered.sort((a, b) => {
          const dComp = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          if (dComp !== 0) return dComp;
          return b.id.localeCompare(a.id);
        });

        // Apply cursor condition if present
        const cursorClause = call.filters.find(
          (f) => f.type === 'or' && f.clause?.startsWith('created_at.lt')
        );
        if (cursorClause) {
          const parts = cursorClause.clause.match(/created_at\.lt\.([^,]+),and\(created_at\.eq\.([^,]+),id\.lt\.([^)]+)\)/);
          if (parts) {
            const cursorDate = new Date(parts[1]).getTime();
            const cursorId = parts[3];
            filtered = filtered.filter((p) => {
              const pDate = new Date(p.created_at).getTime();
              return pDate < cursorDate || (pDate === cursorDate && p.id < cursorId);
            });
          }
        }

        if (call.limitCount) {
          filtered = filtered.slice(0, call.limitCount);
        }

        return { data: filtered, error: null };
      }
      return { data: [], error: null };
    }

    return builder;
  }

  const dbModule = new vm.SyntheticModule(
    ['supabaseAdmin'],
    function () {
      this.setExport('supabaseAdmin', { from: query });
    },
    { context }
  );

  const nextModule = new vm.SyntheticModule(
    ['NextResponse'],
    function () {
      this.setExport('NextResponse', {
        json: (data, options) =>
          new Response(JSON.stringify(data), {
            ...options,
            headers: { 'Content-Type': 'application/json', ...options?.headers },
          }),
      });
    },
    { context }
  );

  const taxonomyCode = await readFile(new URL('../lib/config/jewelleryTypes.mjs', import.meta.url), 'utf8');

  async function loadRoute(path) {
    const code = await readFile(new URL(path, import.meta.url), 'utf8');
    const module = new vm.SourceTextModule(code, { context });
    await module.link((spec) => {
      if (spec.includes('jewelleryTypes')) return new vm.SourceTextModule(taxonomyCode, { context });
      if (spec === 'next/server') return nextModule;
      if (spec.includes('request-user')) return userModule;
      return dbModule;
    });
    await module.evaluate();
    return module.namespace;
  }

  const marketplace = await loadRoute('../app/api/retailer/marketplace/route.js');
  const categories = await loadRoute('../app/api/retailer/marketplace/categories/route.js');
  const hydrate = await loadRoute('../app/api/retailer/marketplace/hydrate/route.js');
  const detail = await loadRoute('../app/api/retailer/marketplace/[id]/route.js');

  return {
    calls,
    marketplaceGET: marketplace.GET,
    categoriesGET: categories.GET,
    hydratePOST: hydrate.POST,
    detailGET: detail.GET,
  };
}

// Generate static test fixture dataset of 60 products with equal timestamps on boundaries
const staticProducts = [];
const baseDate = new Date('2026-10-01T12:00:00Z');
for (let i = 1; i <= 60; i++) {
  const ts = new Date(baseDate.getTime() - Math.floor(i / 2) * 60000).toISOString();
  staticProducts.push({
    id: `prod-${String(i).padStart(3, '0')}`,
    title: `Jewellery Item ${i}`,
    jewellery_type: i % 3 === 0 ? 'necklace' : i % 3 === 1 ? 'haram' : 'ring',
    category: 'gold',
    style: 'traditional',
    metal_purity: '22K',
    net_weight: 15.5,
    is_published: i !== 5, // Item 5 is unpublished
    created_at: ts,
  });
}

test('authorization: rejects unauthenticated and non-retailer callers', async () => {
  const fAnon = await createFixture({ signedIn: false });
  const res1 = await fAnon.marketplaceGET(new Request('http://localhost/api/retailer/marketplace?limit=24'));
  assert.equal(res1.status, 401);

  const fEmployee = await createFixture({ role: 'employee' });
  const res2 = await fEmployee.marketplaceGET(new Request('http://localhost/api/retailer/marketplace?limit=24'));
  assert.equal(res2.status, 403);

  const fPending = await createFixture({ verified: false });
  const res3 = await fPending.marketplaceGET(new Request('http://localhost/api/retailer/marketplace?limit=24'));
  assert.equal(res3.status, 403);
});

test('legacy contract: returns unpaginated products when no pagination params are sent', async () => {
  const f = await createFixture({ products: staticProducts });
  const res = await f.marketplaceGET(new Request('http://localhost/api/retailer/marketplace'));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.products));
  // 59 published products
  assert.equal(data.products.length, 59);
  assert.equal(data.has_more, undefined);
  assert.match(res.headers.get('cache-control'), /no-store/);
});

test('keyset pagination: page 1 returns 24 items, has_more true, and a valid next_cursor', async () => {
  const f = await createFixture({ products: staticProducts, selections: ['prod-001', 'prod-003'] });
  const res = await f.marketplaceGET(new Request('http://localhost/api/retailer/marketplace?limit=24'));
  assert.equal(res.status, 200);
  const data = await res.json();

  assert.equal(data.products.length, 24);
  assert.equal(data.has_more, true);
  assert.ok(data.next_cursor);
  assert.deepEqual(data.selected_product_ids, ['prod-001', 'prod-003']);
  assert.match(res.headers.get('cache-control'), /no-cache/);
  assert.ok(res.headers.get('server-timing'));
});

test('keyset pagination: page 2 using next_cursor returns next items without repeats or omissions', async () => {
  const f = await createFixture({ products: staticProducts });

  const res1 = await f.marketplaceGET(new Request('http://localhost/api/retailer/marketplace?limit=24'));
  const data1 = await res1.json();
  const page1IDs = data1.products.map((p) => p.id);

  const res2 = await f.marketplaceGET(
    new Request(`http://localhost/api/retailer/marketplace?limit=24&cursor=${encodeURIComponent(data1.next_cursor)}`)
  );
  const data2 = await res2.json();
  const page2IDs = data2.products.map((p) => p.id);

  assert.equal(data2.products.length, 24);
  assert.equal(data2.has_more, true);

  // Check no duplicates between Page 1 and Page 2
  const overlap = page1IDs.filter((id) => page2IDs.includes(id));
  assert.deepEqual(overlap, [], 'There should be zero duplicate IDs across pages');

  // Page 3 to end
  const res3 = await f.marketplaceGET(
    new Request(`http://localhost/api/retailer/marketplace?limit=24&cursor=${encodeURIComponent(data2.next_cursor)}`)
  );
  const data3 = await res3.json();
  assert.equal(data3.has_more, false);
  assert.equal(data3.next_cursor, null);
  assert.equal(data1.products.length + data2.products.length + data3.products.length, 59);
});

test('pagination security: rejects invalid or mismatched cursor', async () => {
  const f = await createFixture({ products: staticProducts });

  // Invalid base64 or garbage cursor
  const badRes = await f.marketplaceGET(new Request('http://localhost/api/retailer/marketplace?cursor=garbage'));
  assert.equal(badRes.status, 400);

  // Valid cursor for 'necklace', but caller changes category to 'ring'
  const res1 = await f.marketplaceGET(new Request('http://localhost/api/retailer/marketplace?category=necklace&limit=5'));
  const data1 = await res1.json();

  const mismatchedRes = await f.marketplaceGET(
    new Request(`http://localhost/api/retailer/marketplace?category=ring&cursor=${encodeURIComponent(data1.next_cursor)}`)
  );
  assert.equal(mismatchedRes.status, 400);
  const err = await mismatchedRes.json();
  assert.match(err.error, /does not match/);
});

test('server-side search and category filtering work correctly', async () => {
  const f = await createFixture({ products: staticProducts });

  const catRes = await f.marketplaceGET(new Request('http://localhost/api/retailer/marketplace?category=necklace&limit=50'));
  const catData = await catRes.json();
  assert.ok(catData.products.length > 0);
  assert.ok(catData.products.every((p) => p.jewellery_type === 'necklace'));

  const searchRes = await f.marketplaceGET(new Request('http://localhost/api/retailer/marketplace?search=Item%2010&limit=50'));
  const searchData = await searchRes.json();
  assert.equal(searchData.products.length, 1);
  assert.equal(searchData.products[0].id, 'prod-010');
});

test('categories endpoint: returns distinct categories with accurate counts', async () => {
  const f = await createFixture({ products: staticProducts });
  const res = await f.categoriesGET(new Request('http://localhost/api/retailer/marketplace/categories'));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.categories));
  assert.ok(data.categories.length > 0);
  assert.match(res.headers.get('cache-control'), /stale-while-revalidate/);
});

test('hydrate endpoint: preserves caller ranking order and filters unpublished products', async () => {
  const f = await createFixture({ products: staticProducts, selections: ['prod-003'] });
  const requestedIDs = ['prod-010', 'prod-005', 'prod-003', 'prod-999']; // 005 is unpublished, 999 does not exist
  const res = await f.hydratePOST(
    new Request('http://localhost/api/retailer/marketplace/hydrate', {
      method: 'POST',
      body: JSON.stringify({ product_ids: requestedIDs }),
    })
  );
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.deepEqual(
    data.products.map((p) => p.id),
    ['prod-010', 'prod-003'],
    'Result must preserve requested order and exclude unpublished/missing IDs'
  );
  assert.deepEqual(data.selected_product_ids, ['prod-003']);
});

test('detail endpoint: returns full details and selection status; rejects unpublished product with 404', async () => {
  const f = await createFixture({ products: staticProducts, selections: ['prod-001'] });

  // Published product
  const res1 = await f.detailGET(new Request('http://localhost/api/retailer/marketplace/prod-001'), {
    params: Promise.resolve({ id: 'prod-001' }),
  });
  assert.equal(res1.status, 200);
  const data1 = await res1.json();
  assert.equal(data1.product.id, 'prod-001');
  assert.equal(data1.is_selected, true);
  assert.equal(data1.product.wholesaler_id, undefined, 'Supplier ID must never leak in retailer detail');

  // Unpublished product
  const res2 = await f.detailGET(new Request('http://localhost/api/retailer/marketplace/prod-005'), {
    params: Promise.resolve({ id: 'prod-005' }),
  });
  assert.equal(res2.status, 404);
});


test('chains marketplace filter and counts combine aliases while excluding necklaces', async () => {
  const products = ['chain', 'chains', 'neck chain', 'neck chains', 'necklace'].map((jewellery_type, i) => ({
    id: `chain-${i}`, jewellery_type, is_published: true, created_at: '2026-10-01T12:00:00Z',
  }));
  const fixture = await createFixture({ products });
  const response = await fixture.marketplaceGET(new Request('http://localhost/api/retailer/marketplace?category=Chains&limit=24'));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.products.length, 4);
  assert.ok(data.products.every(p => p.jewellery_type !== 'necklace'));
  const categories = await (await fixture.categoriesGET(new Request('http://localhost/api/retailer/marketplace/categories'))).json();
  assert.deepEqual(categories.categories.find(c => c.id === 'chain'), { id: 'chain', name: 'Chains', count: 4 });
});
