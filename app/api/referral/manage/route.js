import { supabaseAdmin } from '../../../../lib/supabase/admin.js';
import { inviter,reply,failure,invitationLink,uuid } from '../../../../lib/supabase/referral-api.js';
export const runtime='nodejs';
export async function GET(req) {
 const auth=await inviter(req);if(auth.response)return auth.response;
 const expired=await supabaseAdmin.rpc('referral_expire_due',{p_limit:100});
 if(expired.error)return reply({error:'Invitations are temporarily unavailable.'},503);
 const {data:settings,error}=await supabaseAdmin.rpc('referral_settings',{p_user:auth.user.id});
 if(error)return reply({error:'Could not load invitation settings.'},503);
 if(!settings?.ok)return failure(settings);
 const {data:ws,error:ownerError}=await supabaseAdmin.from('wholesalers').select('id').eq('user_id',auth.user.id).single();
 if(ownerError)return reply({error:'Could not load your invitations.'},503);
 if(!ws)return reply({error:'Wholesaler not found.'},404);
 const page=Math.max(0,Math.min(10000,Math.floor(Number(new URL(req.url).searchParams.get('page'))||0)));
 const result=await supabaseAdmin.from('referral_report').select('*',{count:'exact'}).eq('wholesaler_id',ws.id)
 .order('created_at',{ascending:false}).order('id',{ascending:false}).range(page*20,page*20+19);
 if(result.error)return reply({error:'Could not load invitations.'},503);
 return reply({...settings,links:result.data.map(invitationLink),count:result.count,page});
}
export async function POST(req) {
 const auth=await inviter(req);if(auth.response)return auth.response;
 let body;try {body=await req.json();}catch{return reply({error:'Invalid settings.'},400);}
 if(!body || typeof body.skip_guide!=='boolean')return reply({error:'Invalid settings.'},400);
 const {data,error}=await supabaseAdmin.rpc('referral_settings',{p_user:auth.user.id,p_skip:body.skip_guide});
 if(error)return reply({error:'Could not save your preference.'},503);
 return data?.ok?reply(data):failure(data);
}
export async function DELETE(req) {
 const auth=await inviter(req);if(auth.response)return auth.response;
 let body;try {body=await req.json();}catch{return reply({error:'Invalid request.'},400);}
 if(!body || !uuid.test(body.id ?? ''))return reply({error:'Invalid invitation.'},400);
 const {data,error}=await supabaseAdmin.rpc('referral_cancel',{p_user:auth.user.id,p_invitation:body.id});
 if(error)return reply({error:'Could not cancel your invitation.'},503);
 return data?.ok?reply(data):failure(data);
}
