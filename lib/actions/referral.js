"use server";

import { createClient } from "../supabase/server";
import { DB_MESSAGES, messageForDbError } from "../utils/dbMessages";

/**
 * A pending retailer adds the invitation they applied without. Runs as the
 * user: attach_referral_code() checks and spends the code and sets the
 * inviter itself.
 */
export async function attachReferralCode(code) {
  const trimmed = typeof code === "string" ? code.trim() : "";
  if (!trimmed) return { error: DB_MESSAGES.INVITE_CODE_REQUIRED };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data, error } = await supabase.rpc("attach_referral_code", { p_code: trimmed });
  if (error) return { error: messageForDbError(error, error.message) };

  return {
    success: true,
    replayed: data?.replayed === true,
    wholesalerId: data?.wholesaler_id ?? null,
  };
}
