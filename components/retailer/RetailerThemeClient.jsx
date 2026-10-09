"use client";
import { useCredits } from "../../context/CreditsContext";

import { useState } from "react";
import {
  normalizeThemeId,
  THEME_COOKIE_MAX_AGE,
  THEME_STORAGE_KEY,
} from "@/lib/config/themePreference";

const THEMES = [
  {
    id: "indian",
    name: "Indian",
    subtext: "Discover designs selected with precision, blending craftsmanship and ethnic style",
    image: "https://res.cloudinary.com/dcs0vuzwg/image/upload/v1778837501/selected_er11az.svg",
    locked: false,
  },
  {
    id: "maharaja",
    name: "Maharaja",
    subtext: "Discover designs selected with precision, blending craftsmanship and ethnic style",
    image: "https://res.cloudinary.com/dcs0vuzwg/image/upload/v1778837496/locked1_sc4thy.svg",
    locked: false, // Maharaja is no longer locked initially; it is in "CLAIM" state by default
  },
  {
    id: "utsav",
    name: "Utsav",
    subtext: "Discover designs selected with precision, blending craftsmanship and ethnic style",
    image: "https://res.cloudinary.com/dcs0vuzwg/image/upload/v1778837497/locked2_k8imhv.svg",
    locked: true,
  },
  {
    id: "neelam",
    name: "Neelam",
    subtext: "Discover designs selected with precision, blending craftsmanship and ethnic style",
    image: "https://res.cloudinary.com/dcs0vuzwg/image/upload/v1778837499/locked3_jztkzz.svg",
    locked: true,
  },
];

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}

function LockedModal({ theme, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[340px] rounded-[24px] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src={theme.image}
            alt={theme.name}
            className="w-full h-full object-cover"
          />
          {/* Dark overlay */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.3) 55%, rgba(0,0,0,0.1) 100%)" }} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-8 pt-16 pb-10">
          {/* Lock icon ring */}
          <div className="w-16 h-16 rounded-full bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center mb-5 shadow-lg">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>

          <h2 className="font-serif text-white text-[28px] leading-tight mb-2">{theme.name}</h2>

          <div className="w-8 h-[1px] bg-white/40 mx-auto mb-4" />

          <p className="text-white/70 text-[13px] leading-relaxed mb-2">
            This theme is coming in
          </p>
          <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/25 rounded-full px-4 py-1.5 text-white text-[12px] font-semibold tracking-widest uppercase mb-6">
            ✦ Version 2.0
          </span>

          <p className="text-white/50 text-[12px] leading-relaxed mb-8 max-w-[240px]">
            We&apos;re crafting this experience with care. Stay tuned — it will be worth the wait.
          </p>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-full bg-white text-[#111] text-[13px] font-bold tracking-wide hover:bg-white/90 transition-all shadow-lg cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

function ClaimModal({ theme, onClose, onClaimSuccess }) {
  const [isClaiming, setIsClaiming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleClaim = () => {
    setIsClaiming(true);
    setTimeout(() => {
      setIsClaiming(false);
      setIsSuccess(true);
      setTimeout(() => {
        onClaimSuccess();
      }, 1500);
    }, 1000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[340px] rounded-[24px] overflow-hidden shadow-2xl bg-black border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src={theme.image}
            alt={theme.name}
            className="w-full h-full object-cover opacity-80"
          />
          {/* Dark overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0.2) 100%)",
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-8 pt-16 pb-10 min-h-[380px] justify-between">
          {/* Top Deco */}
          <div className="flex justify-center mb-2">
            <span className="text-amber-400 text-sm tracking-[0.3em] font-light">✦ ✦ ✦</span>
          </div>

          {!isSuccess ? (
            <div className="flex-1 flex flex-col items-center justify-center w-full">
              <h2 className="font-serif text-white text-[24px] leading-tight mb-4 max-w-[280px]">
                Claim your palatial theme experience
              </h2>

              <div className="w-8 h-[1px] bg-amber-400/50 mx-auto mb-6" />

              <p className="text-white/60 text-[12.5px] leading-relaxed mb-8 max-w-[240px]">
                Unlock premium components, custom layouts, and a royal theme tailored for your store.
              </p>

              <button
                onClick={handleClaim}
                disabled={isClaiming}
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 text-white text-[13px] font-bold tracking-wide hover:from-amber-600 hover:to-yellow-600 transition-all duration-300 shadow-lg shadow-amber-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {isClaiming ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Applying Theme...
                  </>
                ) : (
                  "CLAIM"
                )}
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center w-full">
              {/* Success Checkmark Circle */}
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/10">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <h3 className="text-emerald-400 font-semibold text-lg mb-2">Success!</h3>
              <p className="text-white text-[15px] font-medium leading-relaxed max-w-[260px]">
                {theme.name} theme applied successfully
              </p>
            </div>
          )}

          {!isSuccess && (
            <button
              onClick={onClose}
              className="mt-6 text-white/40 hover:text-white/70 text-[11px] font-medium tracking-wider uppercase transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RetailerThemeClient({ initialTheme = "indian" }) {
  const { wallet } = useCredits();
  const [selectedTheme, setSelectedTheme] = useState(() => {
    const safeInitialTheme = normalizeThemeId(initialTheme);
    if (typeof window === "undefined") return safeInitialTheme;
    return normalizeThemeId(localStorage.getItem(THEME_STORAGE_KEY), safeInitialTheme);
  });
  const [lockedModal, setLockedModal] = useState(null); // theme object
  const [claimModal, setClaimModal] = useState(null); // theme object to claim

  const writeThemePreference = (themeId) => {
    const safeTheme = normalizeThemeId(themeId);
    setSelectedTheme(safeTheme);
    localStorage.setItem(THEME_STORAGE_KEY, safeTheme);
    document.cookie = `${THEME_STORAGE_KEY}=${safeTheme}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
    return safeTheme;
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] px-6 md:px-10 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[22px] font-bold text-[#111111] leading-tight">Store Theme</h1>
        <p className="text-[13px] text-[#6B7280] mt-1">
          Select the store theme you think justifies your product and vision
        </p>
      </div>

      {/* Theme Grid — 1 col mobile, 2 col tablet+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-[780px]">
        {THEMES.map((theme) => {
          const isSelected = selectedTheme === theme.id;

          return (
            <button
              key={theme.id}
              onClick={() => {
                if (theme.locked && wallet?.mode !== "daily") {
                  setLockedModal(theme);
                } else if (!isSelected) {
                  setClaimModal(theme);
                }
              }}
              className="relative rounded-[18px] overflow-hidden text-left group transition-all duration-300 focus:outline-none cursor-pointer"
              style={{
                aspectRatio: "4/5",
                boxShadow: isSelected
                  ? "0 0 0 3px #111, 0 12px 32px rgba(0,0,0,0.18)"
                  : "0 4px 20px rgba(0,0,0,0.10)",
              }}
            >
              {/* Background image */}
              <img
                src={theme.image}
                alt={theme.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              />
              {/* Dark bottom gradient — same vibe as the modal */}
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.08) 50%, transparent 75%)" }}
              />

              {/* Top badge: SELECTED, CLAIM, or LOCKED */}
              <div className="absolute top-4 left-4 z-10">
                {theme.locked && wallet?.mode !== "daily" ? (
                  <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md border border-white/30 text-white text-[10px] font-bold tracking-widest uppercase rounded-full px-3 py-1.5">
                    <LockIcon />
                    Locked
                  </span>
                ) : isSelected ? (
                  <span className="inline-flex items-center gap-1.5 bg-white text-[#111] text-[10px] font-bold tracking-widest uppercase rounded-full px-3 py-1.5 shadow-sm">
                    ✓ Selected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[10px] font-extrabold tracking-widest uppercase rounded-full px-3.5 py-1.5 shadow-md shadow-amber-950/40 border border-amber-400/20 hover:scale-105 transition-transform duration-300">
                    ✦ Claim
                  </span>
                )}
              </div>

              {/* Bottom text */}
              <div className="absolute bottom-0 left-0 right-0 z-10 p-5 text-center">
                <h2 className="font-serif text-white text-[28px] md:text-[32px] leading-tight mb-1">
                  {theme.name}
                </h2>
                <p className="text-white/70 text-[12px] leading-relaxed">
                  {theme.subtext}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Locked Modal */}
      {lockedModal && (
        <LockedModal theme={lockedModal} onClose={() => setLockedModal(null)} />
      )}

      {/* Claim Modal */}
      {claimModal && (
        <ClaimModal
          theme={claimModal}
          onClose={() => setClaimModal(null)}
          onClaimSuccess={async () => {
            const themeId = writeThemePreference(claimModal.id);
            setClaimModal(null);
            
            // Persist theme to database
            try {
              const { createClient } = await import("@/lib/supabase/client");
              const supabase = createClient();
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                const { error } = await supabase
                  .from("retailers")
                  .update({ selected_theme: themeId })
                  .eq("user_id", user.id);
                if (error) {
                  // TODO: add proper error handling
                }
              }
            } catch (err) {
              // TODO: add proper error handling
            }
          }}
        />
      )}
    </div>
  );
}
