import test from 'node:test';
import assert from 'node:assert/strict';
import { filterDesigns, validateImageFile, normalizeVector, rankMatches, MAX_IMAGE_BYTES, searchableProducts, productSearchImage } from '../lib/catalogue/search.mjs';
const designs = [
  { id: 'a', category: 'Necklace', title: 'Temple necklace', tags: ['Gold'], is_archived: true },
  { id: 'b', category: 'Rings', title: 'Temple ring', tags: ['Silver'] },
  { id: 'c', category: 'necklace', title: 'Chain', tags: null },
];
test('category restriction applies before image search; archived management designs remain searchable', () => {
  assert.deepEqual(filterDesigns(designs, ' NECKLACE ').map(x => x.id), ['a', 'c']);
  assert.equal(filterDesigns(designs, 'Necklace')[0].is_archived, true);
});
test('text matches titles/tags, combining category without changing records', () => {
  assert.deepEqual(filterDesigns(designs, '', 'silver').map(x => x.id), ['b']);
  assert.deepEqual(filterDesigns(designs, 'Necklace', 'temple').map(x => x.id), ['a']);
  assert.deepEqual(filterDesigns(designs, 'Necklace', 'silver'), []);
});
test('image validation rejects empty, wrong format and oversized uploads', () => {
  for (const file of [null, { type: 'image/svg+xml', size: 12 }, { type: 'image/jpeg', size: 0 }, { type: 'image/png', size: MAX_IMAGE_BYTES + 1 }]) assert.throws(() => validateImageFile(file));
  assert.doesNotThrow(() => validateImageFile({ type: 'image/webp', size: 100 }));
});
test('retrieval orders close matches, withholds weak matches and limits results', () => {
  const candidates = [{ id: 'weak', vector: normalizeVector([0, 1]) }, { id: 'close', vector: normalizeVector([1, .2]) }, { id: 'exact', vector: [1, 0] }];
  assert.deepEqual(rankMatches([1, 0], candidates).map(x => x.id), ['exact', 'close']);
  assert.deepEqual(rankMatches([1, 0], candidates, .99, 1).map(x => x.id), ['exact']);
  assert.deepEqual(rankMatches([0, -1], candidates), []);
  assert.throws(() => normalizeVector([0, 0]));
});

test('supplier search uses jewellery type, not metal category, and includes fallback images', () => {
  const product = {id: 'supplier-design', jewellery_type:'necklaces', category:'gold', title:'Temple', image_url:'/fallback.jpg', processed_image_url:'/processed.jpg'};
  assert.equal(productSearchImage(product),'/processed.jpg');
  assert.equal(productSearchImage({...product,processed_image_url:null}),'/fallback.jpg');
  assert.equal(filterDesigns(searchableProducts([product]),'necklace').length,1);
  assert.equal(filterDesigns(searchableProducts([product]),'rings').length,0);
  assert.equal(product.category,'gold');
});
