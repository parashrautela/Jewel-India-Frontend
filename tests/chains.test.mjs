import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeChainType, catalogueTypeAliases } from '../lib/config/jewelleryTypes.mjs';
import { filterDesigns } from '../lib/catalogue/search.mjs';

test('chain aliases are one type; materials and other types remain separate', () => {
  for (const alias of ['chain', 'chains', 'Neck Chain', ' neck   chains ']) {
    assert.equal(normalizeChainType(alias), 'chain');
    assert.deepEqual(catalogueTypeAliases(alias), ['chain', 'chains', 'neck chain', 'neck chains']);
  }
  for (const type of ['necklace', 'pendant', 'gold', null]) assert.equal(normalizeChainType(type), type);
});

test('chain search includes aliases without including necklaces or pendants', () => {
  const designs = ['chain', 'chains', 'neck chain', 'neck chains', 'necklace', 'pendant']
    .map((category, id) => ({ id, category, title: 'Design' }));
  assert.deepEqual(filterDesigns(designs, 'Chains').map(p => p.id), [0, 1, 2, 3]);
  assert.deepEqual(filterDesigns(designs, 'neck chain', 'missing'), []);
});
