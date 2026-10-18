"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import CreditAllowanceStatus from "./CreditAllowanceStatus";
import { useCredits } from "../../context/CreditsContext";
import { fetchLedger } from "../../lib/supabase/credits-queries";

function humanTitle(kind, featureKey, metadata, referenceType) {
  if(referenceType === "invitation_funding") return kind === "refund" ? "Invitation gift refund" : "Invitation gift reserved";
  if(referenceType === "invitation_gift") return "Retailer invitation gift";
  if(referenceType === "purchased_carryover") return "Purchased credits preserved";
  if(referenceType === "referral_bonus") return "Verified referral reward";
  if (kind === "debit") {
    if (featureKey === "chamak.generate") return "Chamak AI Fusion";
    if (featureKey === "chamak.generate_custom") return "Chamak Fusion (Custom Photos)";
    if (featureKey === "chamak.reroll") return "Chamak Try Again / Re-roll";
    if (featureKey === "product.upload") return "Product Upload";
    if (featureKey === "product.reprocess") return "Reprocess Product";
    return featureKey || "Credit Spend";
  }
  if (kind === "grant") {
    if (metadata?.source === "daily" || metadata?.budget_date) return "Daily allowance";
    if (metadata?.source === "welcome" || metadata?.reason?.includes("welcome")) return "Welcome Gift";
    if (metadata?.source === "purchase" || metadata?.reason?.includes("purchase")) return "Credits Purchased";
    return "Credits Added";
  }
  if (kind === "refund") return "Refund — Generation Issue";
  if (kind === "expiry") return "Credits Expired";
  if (kind === "adjustment") return "Admin Adjustment";
  return "Transaction";
}

export default function CreditWalletPage({ dashboard = "/dashboard/wholesaler" }) {
  const { wallet: freshWallet, lastKnownWallet, isStale, rateCardList, isLoading: walletLoading, error: walletError, refresh } = useCredits();

  const wallet = freshWallet ?? lastKnownWallet;
  const [ledger, setLedger] = useState([]);
  const [ledgerCount, setLedgerCount] = useState(0);
  const [isLedgerLoading, setIsLedgerLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all"); // 'all' | 'debit' | 'grant' | 'refund' | 'expiry'
  const [page, setPage] = useState(1);
  const [ledgerError, setLedgerError] = useState(null);
  const limit = 20;

  const loadLedger = useCallback(async () => {
    setIsLedgerLoading(true);
    setLedgerError(null);
    try {
      const kindParam = activeFilter === "all" ? null : activeFilter;
      const offset = (page - 1) * limit;
      const res = await fetchLedger({ limit, offset, kind: kindParam });
      setLedger(Array.isArray(res?.data) ? res.data : []);
      setLedgerCount(typeof res?.count === "number" ? res.count : 0);
    } catch (err) {
      console.error("[TreasureChestPage] Failed to load ledger:", err);
      setLedgerError(err.message);
    } finally {
      setIsLedgerLoading(false);
    }
  }, [activeFilter, page]);

  useEffect(() => {
    const timer = setTimeout(() => void loadLedger(), 0);
    return () => clearTimeout(timer);
  }, [loadLedger]);

  const available = wallet?.available;
  const spent = wallet?.lifetime_spent ?? 0;
  const expired = wallet?.lifetime_expired ?? 0;
  const granted = wallet?.lifetime_granted ?? 0;
  const expiringSoon = wallet?.expiring_soon ?? 0;
  const isLowBalance = Boolean(wallet?.low_balance);

  // Filter out rate card items that cost 0 credits for display
  const nonZeroRates = (Array.isArray(rateCardList) ? rateCardList : []).filter((item) => item?.credits > 0 && !item.feature_key.startsWith("plan.") && !(wallet?.mode === "daily" && item.feature_key.startsWith("theme.")));

  return (
    <div className="min-h-screen bg-[#FEFEFE] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-celestique-taupe px-4 md:px-10 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={dashboard}
            className="flex items-center gap-1.5 text-xs font-bold text-celestique-dark hover:opacity-70 transition-opacity"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7 7l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <div className="h-4 w-px bg-celestique-taupe hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-xl">🪙</span>
            <h1 className="font-cirka text-xl md:text-2xl font-bold text-celestique-dark">
              Credits
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              refresh();
              loadLedger();
            }}
            className="px-3.5 py-1.5 rounded-lg border border-celestique-taupe bg-white hover:bg-celestique-cream text-xs font-semibold text-celestique-dark transition-all flex items-center gap-1.5"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 md:px-10 py-6 md:py-10 flex flex-col gap-8">
        {/* ── 1. BALANCE HERO ─────────────────────────────────────────────────── */}
        <div className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-[#FAF8F5] via-[#F6F1E5] to-[#EFE7D3] p-6 md:p-10 border-2 border-celestique-taupe shadow-sm">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#D4AF37]/15 blur-3xl pointer-events-none rounded-full" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-[#997A15]">
                  {isStale ? "Last known balance" : "Available credits"}
                </span>
                {isLowBalance && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
                    Low Balance
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-3">
                <span className="font-cirka text-5xl md:text-6xl font-bold text-celestique-dark leading-none">
                  {walletLoading ? "…" : available?.toLocaleString("en-IN") ?? "Unavailable"}
                </span>
                <span className="text-base md:text-lg font-medium text-celestique-muted font-sans">
                  credits available
                </span>
              </div>

              {walletError && <p role="alert" className="text-sm text-red-700">{walletError}</p>}
              <CreditAllowanceStatus wallet={wallet} isStale={isStale} />
              {(wallet?.legacy_preserved ?? 0) > 0 && <p className="text-xs text-celestique-muted">Previous credit records are preserved separately.</p>}
              {wallet?.mode !== "daily" && expiringSoon > 0 && (
                <div className="flex items-center gap-2 text-xs text-[#B45309] font-medium bg-[#FFFBEB] border border-[#FDE68A] px-3 py-1.5 rounded-xl self-start mt-2">
                  <span>⏳</span>
                  <span>{expiringSoon} credits are scheduled to expire soon.</span>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── 2. THREE STATS ROW ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-celestique-taupe rounded-2xl p-5 shadow-xs flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-celestique-muted">
              Lifetime Granted
            </span>
            <span className="font-cirka text-2xl font-bold text-celestique-dark">{granted}</span>
            <span className="text-[11px] text-celestique-muted">Total credits deposited into account</span>
          </div>

          <div className="bg-white border border-celestique-taupe rounded-2xl p-5 shadow-xs flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-celestique-muted">
              Lifetime Used
            </span>
            <span className="font-cirka text-2xl font-bold text-celestique-dark">{spent}</span>
            <span className="text-[11px] text-celestique-muted">Credits consumed on AI fusions</span>
          </div>

          <div className="bg-white border border-celestique-taupe rounded-2xl p-5 shadow-xs flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-celestique-muted">
              Lifetime Expired
            </span>
            <span className="font-cirka text-2xl font-bold text-celestique-dark">{expired}</span>
            <span className="text-[11px] text-celestique-muted">Credits past expiration window</span>
          </div>
        </div>

        {/* ── 3. RATE CARD: WHAT THINGS COST ─────────────────────────────────── */}
        {nonZeroRates.length > 0 && (
          <div className="bg-white border border-celestique-taupe rounded-2xl p-6 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-celestique-taupe/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">🏷️</span>
                <h3 className="font-cirka text-lg font-bold text-celestique-dark">
                  Credit Pricing Rate Card
                </h3>
              </div>
              <span className="text-[11px] text-celestique-muted">Transparent per-action pricing</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {nonZeroRates.map((item) => (
                <div
                  key={item.feature_key}
                  className="flex items-start justify-between p-3.5 rounded-xl bg-celestique-cream/30 border border-celestique-taupe/60 gap-3"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-celestique-dark">{item.label}</span>
                    {item.description && (
                      <span className="text-[11px] text-celestique-muted mt-0.5">{item.description}</span>
                    )}
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-celestique-taupe text-xs font-bold text-celestique-dark shrink-0">
                    {item.credits} credits
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 4. TRANSACTION HISTORY ──────────────────────────────────────────── */}
        <div className="bg-white border border-celestique-taupe rounded-2xl p-6 shadow-xs flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-celestique-taupe/60 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-base">📜</span>
              <h3 className="font-cirka text-lg font-bold text-celestique-dark">
                Transaction History
              </h3>
              <span className="text-xs text-celestique-muted">({ledgerCount} records)</span>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide bg-celestique-cream p-1 rounded-xl border border-celestique-taupe text-xs">
              {[
                { id: "all", label: "All" },
                { id: "debit", label: "Spent" },
                { id: "grant", label: "Added" },
                { id: "refund", label: "Refunds" },
                { id: "expiry", label: "Expired" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveFilter(tab.id);
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg font-medium transition-all ${
                    activeFilter === tab.id
                      ? "bg-white text-celestique-dark shadow-xs font-bold"
                      : "text-celestique-muted hover:text-celestique-dark"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ledger Table */}
          {ledgerError ? <p role="alert" className="text-sm text-red-700">{ledgerError}</p> : isLedgerLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-celestique-muted">
              <div className="w-6 h-6 border-2 border-celestique-taupe border-t-celestique-dark rounded-full animate-spin" />
              <span className="text-xs">Loading ledger records...</span>
            </div>
          ) : ledger.length === 0 ? (
            <div className="py-12 text-center text-xs text-celestique-muted">
              No transactions found for this filter.
            </div>
          ) : (
            <div className="divide-y divide-celestique-taupe/40">
              {ledger.map((entry) => {
                const isPositive = entry.delta > 0;
                const dateStr = entry.created_at
                  ? new Date(entry.created_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "";

                const title = humanTitle(entry.kind, entry.feature_key, entry.metadata, entry.reference_type);

                return (
                  <div key={entry.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                          isPositive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-gray-100 text-gray-700 border border-gray-200"
                        }`}
                      >
                        {isPositive ? "+" : "−"}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-celestique-dark">{title}</span>
                        <span className="text-[11px] text-celestique-muted">{dateStr}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span
                        className={`text-xs font-bold font-mono ${
                          isPositive ? "text-emerald-700" : "text-celestique-dark"
                        }`}
                      >
                        {isPositive ? `+${entry.delta}` : `${entry.delta}`} credits
                      </span>
                      <span className="text-[10px] text-celestique-muted">
                        Bal: {entry.balance_after}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {ledgerCount > limit && (
            <div className="flex items-center justify-between pt-4 border-t border-celestique-taupe/60 text-xs">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3.5 py-1.5 rounded-lg border border-celestique-taupe disabled:opacity-40"
              >
                ← Previous
              </button>
              <span className="text-celestique-muted">
                Page {page} of {Math.ceil(ledgerCount / limit)}
              </span>
              <button
                type="button"
                disabled={page >= Math.ceil(ledgerCount / limit)}
                onClick={() => setPage((p) => p + 1)}
                className="px-3.5 py-1.5 rounded-lg border border-celestique-taupe disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </main>

    </div>
  );
}
