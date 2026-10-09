import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '../../../../lib/supabase/admin.js';
import { inviter,reply,failure,invitationLink,uuid } from '../../../../lib/supabase/referral-api.js';
export const runtime='nodejs';
export async function POST(req) {
 const auth=await inviter(req);if(auth.response)return auth.response;
 let body;
 try {body=await req.json();} catch {return reply({error:'Invalid invitation request.'},400);}
 if(!body || typeof body!=='object' || Array.isArray(body))return reply({error:'Invalid invitation request.'},400);
 const gift=body.gift_credits ?? 1000;
 const key=body.idempotency_key ?? randomUUID();
 if(!Number.isInteger(gift) || !uuid.test(key) || (body.source && !['ios','web'].includes(body.source))) return reply({error:'Invalid invitation settings.'},400);
 // Release expired unused promises before reserving another gift.
 const expiry=await supabaseAdmin.rpc('referral_expire_due',{p_limit:100});
 if(expiry.error)return reply({error:'Invitations are temporarily unavailable.'},503);
 const {data,error}=await supabaseAdmin.rpc('referral_generate',{p_user:auth.user.id,p_gift:gift,p_key:key,p_source:body.source || 'web'});
 if(error)return reply({error:'Could not create your invitation. Retry this request.'},503);
 return data?.ok ? reply(invitationLink(data)) : failure(data);
}
