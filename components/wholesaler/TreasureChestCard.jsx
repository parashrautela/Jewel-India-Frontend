"use client";

import Link from "next/link";
import { useCredits } from "../../context/CreditsContext";

export default function TreasureChestCard() {
  const { wallet, isLoading, error } = useCredits();

  // Only show shimmer when actively loading; if wallet is null after load, backend isn't ready yet
  if (isLoading) {
    return (
      <div className="w-full h-32 rounded-2xl bg-celestique-taupe/30 border border-celestique-taupe animate-pulse mb-6" />
    );
  }

  if (!wallet) {
    return (
      <div className="mb-6 w-full rounded-2xl bg-gradient-to-r from-[#FAF8F5] via-[#F6F1E5] to-[#F1E8D5] p-5 border border-[#E6DFD3] flex items-center gap-4 opacity-60">
        <div className="w-12 h-12 rounded-2xl bg-white border border-[#E6DFD3] flex items-center justify-center text-2xl shrink-0">🪙</div>
        <div className="flex flex-col">
          <span className="text-xs font-bold uppercase tracking-wider text-[#997A15]">Treasure Chest</span>
          <span className="font-cirka text-2xl font-bold text-celestique-dark/40 mt-0.5">— credits</span>
          <span className="text-[11px] text-celestique-muted mt-0.5">Balance unavailable</span>
        </div>
      </div>
    );
  }

  const available = wallet.available ?? 0;
  const expiringSoon = wallet.expiring_soon ?? 0;
  const nextExpiry = wallet.next_expiry ? new Date(wallet.next_expiry) : null;
  const isLowBalance = Boolean(wallet.low_balance);

  // Compute days until expiry if available
  let expiryText = "";
  if (expiringSoon > 0) {
    if (nextExpiry && !isNaN(nextExpiry.getTime())) {
      const diffDays = Math.max(1, Math.ceil((nextExpiry - new Date()) / (1000 * 60 * 60 * 24)));
      expiryText = `${expiringSoon} credits expire in ${diffDays} day${diffDays > 1 ? "s" : ""}`;
    } else {
      expiryText = `${expiringSoon} credits expiring soon`;
    }
  }

  return (
    <div className="mb-6 w-full">
      <Link
        href="/dashboard/wholesaler/treasure-chest"
        className="group relative block w-full overflow-hidden rounded-2xl bg-gradient-to-r from-[#FAF8F5] via-[#F6F1E5] to-[#F1E8D5] p-5 md:p-6 border border-[#E6DFD3] transition-all duration-200 hover:shadow-md hover:border-[#D4AF37]/60"
      >
        {/* Subtle decorative gold sheen */}
        <div className="absolute top-0 right-0 w-64 h-32 bg-[#D4AF37]/10 blur-3xl pointer-events-none rounded-full" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Treasure Chest Title & Balance */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white border border-[#E6DFD3] shadow-xs flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
              🪙
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#997A15]">
                  Treasure Chest
                </span>
                {isLowBalance && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
                    Low Balance
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-cirka text-3xl md:text-4xl font-bold text-celestique-dark leading-none">
                  {available}
                </span>
                <span className="text-xs md:text-sm font-medium text-celestique-muted font-sans">
                  {wallet.mode === "daily" ? `/ ${wallet.daily_allowance.toLocaleString("en-IN")} available today` : "credits available"}
                </span>
              </div>

              {wallet.mode === "daily" && <p className="mt-2 text-xs text-celestique-muted">Resets to 2,000 at 12:00 AM IST. Unused credits do not carry over.</p>}
              {error && <p role="status" className="mt-2 text-xs text-red-700">Balance unavailable. Please refresh.</p>}
              {wallet.mode !== "daily" && expiryText && (
                <div className="flex items-center gap-1 text-[11px] text-[#B45309] font-medium mt-1">
                  <span>⏳</span>
                  <span>{expiryText}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Quick Action & Details */}
          <div className="flex items-center gap-3 self-start md:self-center">
            <span className="text-xs font-semibold text-celestique-muted group-hover:text-celestique-dark transition-colors hidden sm:inline">
              View History & Rates →
            </span>
            <div className="px-5 py-2.5 rounded-xl bg-celestique-dark hover:bg-black text-white text-xs font-bold tracking-wide transition-all shadow-xs group-hover:shadow-md flex items-center gap-1.5">
              <span>View credits</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
