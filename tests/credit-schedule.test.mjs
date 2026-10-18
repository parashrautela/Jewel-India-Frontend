import test from 'node:test';
import assert from 'node:assert/strict';
import {remainingMilliseconds,countdown,retryDelay,walletError} from '../lib/credits/schedule.mjs';
const wallet={mode:'daily',server_now:'2026-10-09T15:00:00Z',resets_at:'2026-10-10T15:00:00Z',received_at_monotonic_ms:1000};
test('rolling countdown uses server duration and elapsed monotonic time, including the exact boundary',()=>{
  assert.equal(countdown(remainingMilliseconds(wallet,1000)),'24:00:00');
  assert.equal(remainingMilliseconds(wallet,86400999),1);
  assert.equal(remainingMilliseconds(wallet,86401000),0);
  assert.equal(remainingMilliseconds(wallet,86402000),0);
  assert.equal(remainingMilliseconds(wallet,999),86400000);
});
test('device wall-clock changes cannot affect the schedule',()=>{
  const old=Date.now;
  try {Date.now=()=>0;const before=remainingMilliseconds(wallet,61000);Date.now=()=>9e15;assert.equal(remainingMilliseconds(wallet,61000),before);}
  finally {Date.now=old;}
});
test('legacy, paused-without-deadline and invalid schedules never fabricate a countdown',()=>{
  for(const data of [{...wallet,mode:'legacy'},{...wallet,resets_at:null},{...wallet,resets_at:'invalid'},
    {...wallet,server_now:null},{...wallet,received_at_monotonic_ms:undefined},{...wallet,resets_at:'2026-10-11T15:00:00Z'}]) assert.equal(remainingMilliseconds(data,1000),null);
});
test('outage retries back off and remain bounded instead of spinning at an expired deadline',()=>{
  assert.deepEqual([1,2,3,4,5,99].map(retryDelay),[5000,10000,20000,40000,60000,60000]);
});
test('wallet failure explanations distinguish authentication, approval and unavailable program',()=>{
  assert.match(walletError('NOT_AUTHENTICATED'),/Sign in/);assert.match(walletError('NOT_VERIFIED'),/approval/);
  assert.match(walletError('CREDIT_PROGRAM_UNAVAILABLE'),/contact support/);assert.match(walletError('PGRST202'),/out of date/);
});
