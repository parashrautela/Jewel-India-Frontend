"use client";
import { useEffect, useState } from 'react';
import { remainingMilliseconds, countdown } from '../../lib/credits/schedule.mjs';
export default function CreditAllowanceStatus({wallet,isStale}) {
  const [now,setNow]=useState(null);
  useEffect(()=>{
    const timer=setInterval(()=>setNow(performance.now()),1000);
    return ()=>clearInterval(timer);
  },[]);
  if (wallet?.mode!=='daily') return null;
  const remaining=remainingMilliseconds(wallet,now ?? wallet.received_at_monotonic_ms);
  const rolling=wallet.policy_type==='rolling_24h';
  return <div className="space-y-2 text-sm text-celestique-muted mt-3" data-testid="allowance-status">
    {wallet.is_paused ? <p>Recurring credits are paused. Valid gift and purchased credits remain available.</p>
      : <p>{wallet.daily_allowance == null ? 'Allowance details are unavailable.' : `Your current allowance is ${wallet.daily_allowance.toLocaleString('en-IN')} credits.`} {rolling ? 'Each allowance lasts 24 hours from issuance.' : 'Allowances refresh at midnight India time.'}</p>}
    {isStale ? <p role="status">Last known balance. Refresh failed; credit availability must be checked again.</p>
      : remaining != null && <p>Next refill in <strong className="font-mono text-celestique-dark" data-testid="credit-countdown">{countdown(remaining)}</strong>
        <span className="block">{new Date(wallet.resets_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST</span></p>}
    {!isStale && !wallet.is_paused && remaining==null && <p>The next refill time is unavailable. Refresh to check again.</p>}
    {wallet.next_allowance != null && wallet.next_allowance!==wallet.daily_allowance && <p>Next allowance: {wallet.next_allowance===0 ? 'Paused (0 credits)' : `${wallet.next_allowance.toLocaleString('en-IN')} credits`}. Current credits retain their deadline.</p>}
    <p>Recurring: {wallet.daily_available ?? 'Unavailable'} · Gifts: {wallet.gift_available ?? wallet.bonus_available ?? 'Unavailable'} · Purchased: {wallet.paid_available ?? 'Unavailable'}</p>
    <p>Unused recurring credits expire at the refill. Gift and purchased credits follow their own rules.{wallet.shared_business_wallet && ' Staff share the business wallet.'}</p>
  </div>;
}
