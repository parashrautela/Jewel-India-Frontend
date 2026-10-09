import { createClient } from "../../../../lib/supabase/server";
import { supabaseAdmin } from "../../../../lib/supabase/admin";
import { redirect } from "next/navigation";
import ReferralManager from "../../../../components/wholesaler/referral/ReferralManager";

export const metadata = {
  title: "Add Retailer — Jewel India",
  description: "Generate referral links to invite retailers.",
};
export default async function AddRetailerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entry_page/signin");

  const role = user.user_metadata?.role;
  if (role !== "wholesaler") redirect("/");

  const { data: wholesaler } = await supabaseAdmin
    .from("wholesalers")
    .select("id, business_name, verification_status")
    .eq("user_id", user.id)
    .single();

  if (!wholesaler || wholesaler.verification_status !== "verified") {
    redirect("/onboard/submitted");
  }

  return <main className="min-h-screen bg-white pb-20"><header className="px-6 py-6"><h1 className="font-cirka text-3xl font-bold">Invite retailers</h1></header><ReferralManager key={user.id} accountId={user.id} /></main>;
}
