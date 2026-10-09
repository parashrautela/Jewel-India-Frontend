"use client";

import Link from "next/link";

export default function InsufficientCreditsModal({
  isOpen,
  onClose,
  required = 10,
  balance = 0,
  shortBy = 10,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-2xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-celestique-taupe animate-scale-in">
        {/* Close Icon Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-black text-lg p-1"
        >
          ✕
        </button>

        <div className="flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-center text-2xl shrink-0">
              🪙
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-[#997A15]">
                Treasure Chest Alert
              </span>
              <h3 className="font-cirka text-xl md:text-2xl font-bold text-celestique-dark">
                Insufficient Credits
              </h3>
            </div>
          </div>

          {/* Detailed Message */}
          <p className="text-xs text-celestique-muted leading-relaxed font-sans">
            You need <strong className="text-celestique-dark font-bold">{shortBy} more credits</strong> to
            fuse this design. Your configured slider values and custom notes have been preserved.
          </p>

          {/* Breakdown Card */}
          <div className="grid grid-cols-3 gap-2 bg-[#FAF8F5] border border-celestique-taupe/80 p-3.5 rounded-2xl text-center">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-celestique-muted tracking-wider">
                Required
              </span>
              <span className="font-cirka text-lg font-bold text-celestique-dark">{required}</span>
            </div>
            <div className="flex flex-col border-x border-celestique-taupe/60">
              <span className="text-[10px] uppercase font-bold text-celestique-muted tracking-wider">
                Available
              </span>
              <span className="font-cirka text-lg font-bold text-[#997A15]">{balance}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-red-600 tracking-wider">
                Needed
              </span>
              <span className="font-cirka text-lg font-bold text-red-600">+{shortBy}</span>
            </div>
          </div>

          <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950">Your daily allowance resets to 2,000 credits at 12:00 AM IST. Unused credits do not carry over. Try again after the reset.</p>

          {/* Action CTAs */}
          <div className="flex flex-col gap-2 pt-2">
            <Link
              href="/dashboard/wholesaler/treasure-chest"
              onClick={onClose}
              className="w-full py-3.5 rounded-full bg-celestique-dark hover:bg-black text-white text-xs font-bold uppercase tracking-wider transition-all text-center shadow-sm"
            >
              View credits and history →
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-full text-xs font-semibold text-celestique-muted hover:text-celestique-dark transition-colors text-center"
            >
              Cancel & Return to Sliders
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
