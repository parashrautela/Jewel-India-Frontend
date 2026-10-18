import { NextResponse } from "next/server.js";

/**
 * Asserts that a feature is not blocked for a wholesaler user.
 * Calls RPC `public.feature_blocked(p_user, p_key)`.
 * If blocked, returns a 403 NextResponse with JSON { error: "<message>" }.
 * If allowed (or if lookup errors / fail open), returns null.
 *
 * @param {any} supabaseAdmin - Supabase client (service role)
 * @param {string} wholesalerUserId - Wholesaler auth user UUID
 * @param {string} key - Feature key (e.g. 'publish_to_retailer', 'orders', 'messages')
 * @param {string} [customMessage] - Specific error message for clients
 * @returns {Promise<NextResponse|null>}
 */
export async function assertFeature(supabaseAdmin, wholesalerUserId, key, customMessage) {
  if (!wholesalerUserId || !key) {
    return null;
  }

  try {
    const { data, error } = await supabaseAdmin.rpc("feature_blocked", {
      p_user: wholesalerUserId,
      p_key: key,
    });

    if (error) {
      console.error(`[featureFlags] Lookup error for user=${wholesalerUserId}, key=${key}:`, error);
      // Fail open on error
      return null;
    }

    if (data === true) {
      const message = customMessage || "This feature is not available for this supplier right now.";
      return NextResponse.json(
        {
          error: message,
          code: "FEATURE_DISABLED",
          feature: key,
        },
        { status: 403 }
      );
    }

    return null;
  } catch (err) {
    console.error(`[featureFlags] Unexpected error for user=${wholesalerUserId}, key=${key}:`, err);
    return null;
  }
}
