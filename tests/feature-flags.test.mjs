import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertFeature } from '../lib/featureFlags.js';

test('assertFeature returns null when input is missing or empty', async () => {
  assert.equal(await assertFeature(null, null, 'orders'), null);
  assert.equal(await assertFeature({}, '', 'orders'), null);
});

test('assertFeature returns 403 when feature_blocked returns true', async () => {
  const mockAdmin = {
    rpc: async (name, args) => {
      assert.equal(name, 'feature_blocked');
      assert.equal(args.p_user, '00000000-0000-0000-0000-000000000001');
      assert.equal(args.p_key, 'orders');
      return { data: true, error: null };
    },
  };

  const response = await assertFeature(
    mockAdmin,
    '00000000-0000-0000-0000-000000000001',
    'orders',
    'This supplier is not accepting orders right now.'
  );

  assert.ok(response);
  assert.equal(response.status, 403);
  const body = await response.json();
  assert.equal(body.error, 'This supplier is not accepting orders right now.');
  assert.equal(body.code, 'FEATURE_DISABLED');
  assert.equal(body.feature, 'orders');
});

test('assertFeature returns null when feature_blocked returns false', async () => {
  const mockAdmin = {
    rpc: async () => ({ data: false, error: null }),
  };

  const response = await assertFeature(
    mockAdmin,
    '00000000-0000-0000-0000-000000000001',
    'orders'
  );

  assert.equal(response, null);
});

test('assertFeature fails open (returns null) on rpc error', async () => {
  const mockAdmin = {
    rpc: async () => ({ data: null, error: { message: 'DB down' } }),
  };

  const response = await assertFeature(
    mockAdmin,
    '00000000-0000-0000-0000-000000000001',
    'orders'
  );

  assert.equal(response, null);
});

test('assertFeature returns exact wholesaler locked message for publish_to_retailer', async () => {
  const mockAdmin = {
    rpc: async (name, args) => {
      assert.equal(name, 'feature_blocked');
      assert.equal(args.p_key, 'publish_to_retailer');
      return { data: true, error: null };
    },
  };

  const response = await assertFeature(
    mockAdmin,
    '00000000-0000-0000-0000-000000000001',
    'publish_to_retailer',
    'Publishing has been locked for your account by Jewel India admin. Contact support to unlock it.'
  );

  assert.ok(response);
  assert.equal(response.status, 403);
  const body = await response.json();
  assert.equal(body.error, 'Publishing has been locked for your account by Jewel India admin. Contact support to unlock it.');
  assert.equal(body.code, 'FEATURE_DISABLED');
  assert.equal(body.feature, 'publish_to_retailer');
});

