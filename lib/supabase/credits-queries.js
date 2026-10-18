import { createClient } from "./client";
import { walletError } from "../credits/schedule.mjs";

/**
 * Fetch the authenticated wholesaler's credit wallet.
 * Errors retain their server code; a missing program never fabricates a balance.
 */
export async function fetchWallet() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("credits_wallet");
  if (error || !data?.ok) {
    const code = data?.error || error?.code || 'UNAVAILABLE';
    const failure = new Error(walletError(code));
    failure.code = code;
    throw failure;
  }
  return { ...data, received_at_monotonic_ms: performance.now() };
}

/**
 * Fetch the public rate card from `credit_prices`.
 * Gracefully returns [] if the table doesn't exist yet.
 */
export async function fetchRateCard() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("credit_prices")
      .select("feature_key, credits, label, description, sort_order, is_active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      // Swallow table-not-found errors silently
      if (
        error.code === "PGRST204" ||
        error.code === "42P01" ||
        error.message?.toLowerCase().includes("relation") ||
        error.message?.toLowerCase().includes("does not exist")
      ) {
        return [];
      }
      console.warn("[credits-queries] fetchRateCard:", error.message);
      return [];
    }

    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn("[credits-queries] fetchRateCard exception:", err?.message);
    return [];
  }
}

/**
 * Fetch the wholesaler's credit ledger (transaction history).
 * Gracefully returns empty if the table doesn't exist yet.
 */
export async function fetchLedger({ limit = 50, offset = 0, kind = null } = {}) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("credits_history", {
    p_limit: limit, p_offset: offset, p_kind: kind,
  });
  if (error || !data?.ok) throw new Error("Couldn't load credit history. Please try again.");
  return { data: data.data, count: data.count };
}

/**
 * Fetch active credit lots for expiring breakdown.
 * Gracefully returns [] if the table doesn't exist yet.
 */
export async function fetchCreditLots() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("credit_lots")
      .select("id, credits_remaining, expires_at, source, created_at")
      .gt("credits_remaining", 0)
      .order("expires_at", { ascending: true, nullsFirst: false });

    if (error) {
      if (
        error.code === "PGRST204" ||
        error.code === "42P01" ||
        error.message?.toLowerCase().includes("relation")
      ) {
        return [];
      }
      console.warn("[credits-queries] fetchCreditLots:", error.message);
      return [];
    }

    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn("[credits-queries] fetchCreditLots exception:", err?.message);
    return [];
  }
}
