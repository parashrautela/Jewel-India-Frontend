import { useEffect, useState } from "react";
import { createClient } from "../supabase/client";
import { messageForInviteReason } from "../utils/dbMessages";

const DEBOUNCE_MS = 400;

/**
 * Checks an invitation code as it is typed, through validate_referral_code()
 * (callable before sign-in, so the anon client is enough).
 *
 * Returns { status: "idle" | "checking" | "valid" | "invalid", ... } with
 * `code` and `wholesalerName` when valid and `message` when not.
 */
export function useInviteCode(code) {
  const trimmed = (code || "").trim();
  // The last answer and the code it was for; anything newer is still "checking".
  const [result, setResult] = useState({ forCode: "", value: null });

  useEffect(() => {
    if (!trimmed) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("validate_referral_code", { p_code: trimmed });
      if (cancelled) return;

      let value;
      if (error || !data) {
        value = { status: "invalid", message: "We couldn't check that code. Please try again." };
      } else if (data.valid) {
        value = {
          status: "valid",
          code: data.code,
          wholesalerName: data.wholesaler_name,
          wholesalerLogoUrl: data.wholesaler_logo_url || null,
          expiresAt: data.expires_at,
        };
      } else {
        value = { status: "invalid", message: messageForInviteReason(data.reason) };
      }
      setResult({ forCode: trimmed, value });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed]);

  if (!trimmed) return { status: "idle" };
  if (result.forCode !== trimmed) return { status: "checking" };
  return result.value;
}
