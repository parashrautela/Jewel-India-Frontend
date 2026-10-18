import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertFeature } from '../lib/featureFlags.js';

test('orders check: single supplier with orders blocked returns 403', async () => {
  const blockedWholesalerId = '00000000-0000-0000-0000-000000000001';
  const mockAdmin = {
    rpc: async (name, args) => {
      if (args.p_user === blockedWholesalerId && args.p_key === 'orders') {
        return { data: true, error: null };
      }
      return { data: false, error: null };
    },
  };

  const response = await assertFeature(
    mockAdmin,
    blockedWholesalerId,
    'orders',
    'This supplier is not accepting orders right now.'
  );

  assert.ok(response);
  assert.equal(response.status, 403);
  const json = await response.json();
  assert.equal(json.error, 'This supplier is not accepting orders right now.');
  assert.equal(json.code, 'FEATURE_DISABLED');
  assert.equal(json.feature, 'orders');
});

test('orders check: multi-supplier cart fails if any supplier is blocked', async () => {
  const allowedWholesaler = '00000000-0000-0000-0000-000000000001';
  const blockedWholesaler = '00000000-0000-0000-0000-000000000002';
  const mockAdmin = {
    rpc: async (name, args) => {
      return { data: args.p_user === blockedWholesaler, error: null };
    },
  };

  const suppliers = [allowedWholesaler, blockedWholesaler];
  let blockedResult = null;
  for (const wid of suppliers) {
    const res = await assertFeature(
      mockAdmin,
      wid,
      'orders',
      'This supplier is not accepting orders right now.'
    );
    if (res) {
      blockedResult = res;
      break;
    }
  }

  assert.ok(blockedResult);
  assert.equal(blockedResult.status, 403);
  const json = await blockedResult.json();
  assert.equal(json.code, 'FEATURE_DISABLED');
});

test('orders check: allowed supplier passes with null response', async () => {
  const allowedWholesaler = '00000000-0000-0000-0000-000000000001';
  const mockAdmin = {
    rpc: async () => ({ data: false, error: null }),
  };

  const res = await assertFeature(
    mockAdmin,
    allowedWholesaler,
    'orders',
    'This supplier is not accepting orders right now.'
  );

  assert.equal(res, null);
});
