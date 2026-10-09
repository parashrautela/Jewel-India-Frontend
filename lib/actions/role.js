"use server";

import { createClient } from "../supabase/server";
import { messageForDbError } from "../utils/dbMessages";

/**
 * Record which door the user came through. set_my_role() is the only way a
 * person can choose their own role — the database pins direct writes to
 * profiles and to the account metadata — and it refuses once an application
 * or a job is attached to the account.
 */
export async function setUserRole(role) {
  if (!["wholesaler", "retailer"].includes(role)) {
    return { error: "Invalid role." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase.rpc("set_my_role", { p_role: role });
  if (error) return { error: messageForDbError(error, error.message) };

  return { success: true, role };
}

/**
 * Link a Google sign-in to the store that invited that address. Only a
 * Google session can claim: the address has to come from Google itself.
 */
export async function claimStaffInvite() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data, error } = await supabase.rpc("claim_staff_invite");
  if (error) return { error: messageForDbError(error, error.message) };

  const claim = Array.isArray(data) ? data[0] : data;
  return {
    success: true,
    employeeId: claim?.employee_id ?? null,
    retailerId: claim?.retailer_id ?? null,
    businessName: claim?.business_name ?? null,
  };
}

/**
 * Get the current user's role from Supabase profiles table.
 * Falls back to user_metadata if profile row doesn't exist yet.
 */
export async function getUserRole() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Try metadata first (fastest — from JWT)
  if (user.user_metadata?.role) return user.user_metadata.role;

  // Fallback: query profiles table
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return data?.role ?? null;
}
