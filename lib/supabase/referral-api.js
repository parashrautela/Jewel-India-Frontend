import { NextResponse } from 'next/server';
import { getRequestUser } from './request-user.js';
export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const messages = {NOT_VERIFIED:'Only verified wholesalers can invite retailers.',REFERRALS_PAUSED:'Reward invitations are being prepared. Please try again later.',INSUFFICIENT_CREDITS:'You need more credits for this gift.',INVALID_SETTINGS:'Choose 1,000–10,000 credits in steps of 500.',IDEMPOTENCY_CONFLICT:'This request already created a different gift. Refresh and try again.',ALREADY_ACCEPTED:'This retailer has already accepted the invitation.',NOT_RELEASABLE:'This invitation cannot be cancelled.'};
export const reply = (body, status=200) => NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
export function failure(data) { return reply({error:messages[data?.error] || 'Unable to update this invitation.',code:data?.error,balance:data?.balance,required:data?.required},data?.error==='NOT_VERIFIED'?403:409); }
export async function inviter(req) {
 const {user,error}=await getRequestUser(req);
 return error || !user ? {response:reply({error:'Please sign in.'},401)} : {user};
}
export function invitationLink(data) {
 const site=(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/,'');
 const status=data.status || (data.funding_state==='settled'?'rewarded':data.release_reason|| (data.accepted_by?'pending':Date.parse(data.expires_at)<=Date.now()?'expired':'unclaimed'));
 return {...data,status,link:`${site}/join/${encodeURIComponent(data.code)}`};
}
