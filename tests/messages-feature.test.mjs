import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertFeature } from '../lib/featureFlags.js';

test('chat check: creating conversation with supplier with messages blocked returns 403', async () => {
  const blockedWholesalerId = '00000000-0000-0000-0000-000000000001';
  const mockAdmin = {
    rpc: async (name, args) => {
      assert.equal(name, 'feature_blocked');
      assert.equal(args.p_user, blockedWholesalerId);
      assert.equal(args.p_key, 'messages');
      return { data: true, error: null };
    },
  };

  const response = await assertFeature(
    mockAdmin,
    blockedWholesalerId,
    'messages',
    'Messaging is not available for this supplier right now.'
  );

  assert.ok(response);
  assert.equal(response.status, 403);
  const json = await response.json();
  assert.equal(json.error, 'Messaging is not available for this supplier right now.');
  assert.equal(json.code, 'FEATURE_DISABLED');
  assert.equal(json.feature, 'messages');
});

test('chat check: sending message in conversation with blocked supplier returns 403', async () => {
  const convWholesalerId = '00000000-0000-0000-0000-000000000002';
  const mockAdmin = {
    rpc: async (name, args) => {
      return { data: args.p_user === convWholesalerId && args.p_key === 'messages', error: null };
    },
  };

  const response = await assertFeature(
    mockAdmin,
    convWholesalerId,
    'messages',
    'Messaging is not available for this supplier right now.'
  );

  assert.ok(response);
  assert.equal(response.status, 403);
  const json = await response.json();
  assert.equal(json.code, 'FEATURE_DISABLED');
});

test('chat check: active supplier passes with null response', async () => {
  const allowedWholesaler = '00000000-0000-0000-0000-000000000003';
  const mockAdmin = {
    rpc: async () => ({ data: false, error: null }),
  };

  const res = await assertFeature(
    mockAdmin,
    allowedWholesaler,
    'messages',
    'Messaging is not available for this supplier right now.'
  );

  assert.equal(res, null);
});

test('R4: sending message as wholesaler with messages blocked returns wholesaler-specific error', async () => {
  const wholesalerId = '00000000-0000-0000-0000-000000000004';
  const mockAdmin = {
    rpc: async (name, args) => {
      assert.equal(name, 'feature_blocked');
      assert.equal(args.p_user, wholesalerId);
      assert.equal(args.p_key, 'messages');
      return { data: true, error: null };
    },
  };

  const senderType = 'wholesaler';
  const blockedMsg =
    senderType === 'wholesaler'
      ? 'Messaging has been locked for your account by Jewel India admin. Contact support to unlock it.'
      : 'Messaging is not available for this supplier right now.';

  const response = await assertFeature(
    mockAdmin,
    wholesalerId,
    'messages',
    blockedMsg
  );

  assert.ok(response);
  assert.equal(response.status, 403);
  const json = await response.json();
  assert.equal(json.error, 'Messaging has been locked for your account by Jewel India admin. Contact support to unlock it.');
  assert.equal(json.code, 'FEATURE_DISABLED');
  assert.equal(json.feature, 'messages');
});

test('R4: sending message as retailer/employee with messages blocked returns retailer sentence', async () => {
  const wholesalerId = '00000000-0000-0000-0000-000000000005';
  const mockAdmin = {
    rpc: async () => ({ data: true, error: null }),
  };

  const senderType = 'employee';
  const blockedMsg =
    senderType === 'wholesaler'
      ? 'Messaging has been locked for your account by Jewel India admin. Contact support to unlock it.'
      : 'Messaging is not available for this supplier right now.';

  const response = await assertFeature(
    mockAdmin,
    wholesalerId,
    'messages',
    blockedMsg
  );

  assert.ok(response);
  assert.equal(response.status, 403);
  const json = await response.json();
  assert.equal(json.error, 'Messaging is not available for this supplier right now.');
  assert.equal(json.code, 'FEATURE_DISABLED');
  assert.equal(json.feature, 'messages');
});

test('R4: creating conversation as wholesaler caller uses wholesaler-specific error', async () => {
  const wholesalerId = '00000000-0000-0000-0000-000000000006';
  const mockAdmin = {
    rpc: async () => ({ data: true, error: null }),
  };

  const isWholesalerCaller = true;
  const blockedMsg = isWholesalerCaller
    ? 'Messaging has been locked for your account by Jewel India admin. Contact support to unlock it.'
    : 'Messaging is not available for this supplier right now.';

  const response = await assertFeature(
    mockAdmin,
    wholesalerId,
    'messages',
    blockedMsg
  );

  assert.ok(response);
  assert.equal(response.status, 403);
  const json = await response.json();
  assert.equal(json.error, 'Messaging has been locked for your account by Jewel India admin. Contact support to unlock it.');
});

