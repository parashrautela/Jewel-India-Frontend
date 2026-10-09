import { supabaseAdmin } from "../../../lib/supabase/admin";
import { notFound } from "next/navigation";
import JoinLandingClient from "./JoinLandingClient";

/**
 * Server component — validates the referral code on the server,
 * then passes the wholesaler info down to the client component.
 *
 * Route: /join/[code]
 */
export async function generateMetadata({ params }) {
  const { code } = await params;
  return {
    title: "You've been invited — Jewel India",
    description: `Join via referral code ${code} to get started as a retailer.`,
  };
}

export default async function JoinPage({ params }) {
  const { code } = await params;

  const {data:referralData,error}=await supabaseAdmin.rpc('validate_referral_code',{p_code:code});
  if(error)throw new Error('Invitation validation is temporarily unavailable.');

  // ── Invalid / expired / maxed-out code → 404 ───────────────────
  if (!referralData?.valid) {
    notFound();
  }

  return (
    <JoinLandingClient
      code={referralData.code}
      giftCredits={referralData.gift_credits}
      businessName={referralData.business_name}
      wholesalerName={referralData.wholesaler_name}
      businessLogoUrl={referralData.business_logo_url}
    />
  );
}
