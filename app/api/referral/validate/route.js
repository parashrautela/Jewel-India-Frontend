import { supabaseAdmin } from '../../../../lib/supabase/admin.js';
import { reply } from '../../../../lib/supabase/referral-api.js';
export const runtime='nodejs';
export async function GET(req) {
 const code=new URL(req.url).searchParams.get('code')?.trim();
 if(!code || code.length>64)return reply({valid:false,reason:'no_code'},400);
 const {data,error}=await supabaseAdmin.rpc('validate_referral_code',{p_code:code});
 if(error)return reply({valid:false,reason:'unavailable'},503);
 return reply(data,data?.valid ? 200 : data?.reason==='expired' ? 410 : 404);
}
