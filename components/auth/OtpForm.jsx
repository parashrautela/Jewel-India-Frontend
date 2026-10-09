"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "../ui/Button";

const OTP_VALIDITY_SECONDS = 60;  // OTP expires in 60 seconds
const RESEND_COOLDOWN_SECONDS = 30; // wait between resends
const MAX_RESENDS = 5;

// What happens after this step depends on the door the person chose.
const DOOR_NOTES = {
  wholesaler: "Wholesaler accounts are verified by our team before they go live.",
  retailer: "Retailer accounts join on a wholesaler's invitation and are verified before they go live.",
};
const NO_DOOR_NOTE = "You'll choose how you use Jewels India after this step.";

/**
 * OtpForm — 8-digit OTP entry with:
 * - Box-per-digit input
 * - 60s countdown (OTP validity) — disappears on wrong OTP
 * - 30s resend cooldown
 * - Max 5 resends, then 24h lockout
 * - State persists across page refresh via sessionStorage + server rate limits
 */
export function OtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const doorRole = searchParams.get("role");
  const [digits, setDigits] = useState(["", "", "", "", "", "", "", ""]);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState(null);
  const [isWrongOtp, setIsWrongOtp] = useState(false);

  // Timers
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(OTP_VALIDITY_SECONDS);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showStopwatch, setShowStopwatch] = useState(true);

  // Rate limit state
  const [remainingResends, setRemainingResends] = useState(MAX_RESENDS);
  const [lockedUntil, setLockedUntil] = useState(null);

  const [identity, setIdentity] = useState(null);


  const inputRefs = useRef([]);
  const otpTimerRef = useRef(null);
  const resendTimerRef = useRef(null);

  // ── Restore state on mount ─────────────────────────────────────────────────
  useEffect(() => {
    const storedIdentity = sessionStorage.getItem("auth_identity");
    const storedSentAt = sessionStorage.getItem("otp_sent_at");
    const storedRemainingResends = sessionStorage.getItem("otp_remaining_resends");
    const storedLockedUntil = sessionStorage.getItem("otp_locked_until");

    if (!storedIdentity) {
      // No identity — user landed here without going through entry
      router.replace("/entry_page/signup");
      return;
    }

    setIdentity(storedIdentity);


    if (storedLockedUntil) {
      const lockDate = new Date(storedLockedUntil);
      if (new Date() < lockDate) {
        setLockedUntil(storedLockedUntil);
        setRemainingResends(0);
        setShowStopwatch(false);
        return;
      } else {
        // Lock expired
        sessionStorage.removeItem("otp_locked_until");
      }
    }

    if (storedRemainingResends !== null) {
      setRemainingResends(parseInt(storedRemainingResends, 10));
    }

    // Calculate remaining OTP validity from sentAt
    if (storedSentAt) {
      const sentAt = new Date(storedSentAt);
      const elapsed = Math.floor((new Date() - sentAt) / 1000);
      const remaining = OTP_VALIDITY_SECONDS - elapsed;
      if (remaining > 0) {
        setOtpSecondsLeft(remaining);
        setShowStopwatch(true);
      } else {
        setOtpSecondsLeft(0);
        setShowStopwatch(false);
      }
    }
  }, [router]);

  // ── OTP validity countdown ─────────────────────────────────────────────────
  useEffect(() => {
    if (!showStopwatch || otpSecondsLeft <= 0) return;

    otpTimerRef.current = setInterval(() => {
      setOtpSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(otpTimerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(otpTimerRef.current);
  }, [showStopwatch]);

  // ── Resend cooldown countdown ─────────────────────────────────────────────
  useEffect(() => {
    if (resendCooldown <= 0) return;

    resendTimerRef.current = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          clearInterval(resendTimerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(resendTimerRef.current);
  }, [resendCooldown]);

  // ── Format time as MM:SS ───────────────────────────────────────────────────
  function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  // ── OTP input handlers ─────────────────────────────────────────────────────
  function handleDigitChange(index, value) {
    // Only allow single digit
    const char = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    setError(null);
    setIsWrongOtp(false);

    if (char && index < 7) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < 7) inputRefs.current[index + 1]?.focus();
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 8);
    if (!pasted) return;
    const next = [...digits];
    pasted.split("").forEach((char, i) => {
      if (i < 8) next[i] = char;
    });
    setDigits(next);
    const lastFilledIndex = Math.min(pasted.length, 7);
    inputRefs.current[lastFilledIndex]?.focus();
  }

  // ── Verify OTP ─────────────────────────────────────────────────────────────
  async function handleVerify(e) {
    e.preventDefault();
    const token = digits.join("");
    if (token.length !== 8) {
      setError("Please enter the complete 8-digit code.");
      return;
    }
    if (!identity) {
      router.replace("/entry_page/signup");
      return;
    }

    setVerifying(true);
    setError(null);

    const referralCode = sessionStorage.getItem("referral_code");

    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity, token, referralCode }),
    });
    const data = await res.json();

    if (!res.ok || data.error) {
      setIsWrongOtp(true);
      setShowStopwatch(false); // stopwatch disappears on wrong OTP
      clearInterval(otpTimerRef.current);
      setError(data.error || "Invalid OTP. Please try again or resend.");
      setDigits(["", "", "", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      setVerifying(false);
      return;
    }

    // Success — route based on user status
    if (data.isNewUser) {
      // The door rides along; with none chosen, set-password sends them to /select-role.
      const paramRole = doorRole || sessionStorage.getItem("referral_role");
      router.push(`/entry_page/signup/set-password${paramRole ? `?role=${paramRole}` : ""}`);
    } else {
      // Returning user
      if (data.userRole === "retailer") {
        const cookies = document.cookie.split(";").reduce((acc, c) => {
          const [k, v] = c.trim().split("=");
          acc[k] = v;
          return acc;
        }, {});
        const viewMode = cookies["jewel_view_mode"];
        if (viewMode === "retailer") {
          router.push("/dashboard/retailer");
        } else {
          router.push("/dashboard/employee");
        }
      } else if (data.userRole === "employee") {
        router.push("/dashboard/employee");
      } else {
        router.push("/dashboard/wholesaler");
      }
    }
  }

  // ── Resend OTP ─────────────────────────────────────────────────────────────
  async function handleResend() {
    if (!identity || resendCooldown > 0 || remainingResends <= 0 || lockedUntil) return;

    setResending(true);
    setError(null);

    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity }),
    });
    const data = await res.json();

    if (!res.ok) {
      if (data.locked) {
        setLockedUntil(data.lockedUntil);
        sessionStorage.setItem("otp_locked_until", data.lockedUntil);
        setRemainingResends(0);
        sessionStorage.setItem("otp_remaining_resends", "0");
      } else if (data.cooldown) {
        setResendCooldown(data.waitSeconds || RESEND_COOLDOWN_SECONDS);
      }
      setError(data.error);
      setResending(false);
      return;
    }

    // Success — reset timers
    const now = new Date().toISOString();
    sessionStorage.setItem("otp_sent_at", now);
    const newRemaining = data.remainingResends ?? Math.max(0, remainingResends - 1);
    setRemainingResends(newRemaining);
    sessionStorage.setItem("otp_remaining_resends", String(newRemaining));

    // Restart OTP validity countdown
    setOtpSecondsLeft(OTP_VALIDITY_SECONDS);
    setShowStopwatch(true);
    setIsWrongOtp(false);
    setDigits(["", "", "", "", "", "", "", ""]);
    inputRefs.current[0]?.focus();

    // Start resend cooldown
    setResendCooldown(RESEND_COOLDOWN_SECONDS);

    setResending(false);
  }

  const otpComplete = digits.every(Boolean) && digits.length === 8;
  const isLocked = !!lockedUntil && new Date() < new Date(lockedUntil);

  return (
    <div className="-mt-1 text-left w-full max-w-[400px]">
      {/* Subtitle / Identity display */}
      <div className="mb-[32px]">
        {identity && (
          <p className="text-[14px] text-[#9CA3AF] font-normal leading-[1.5]">
            The 8-digit OTP has been sent to you at<br/>
            <span className="text-[#111827]">
              {identity} 
              <button 
                 type="button"
                 onClick={() => router.replace("/entry_page/signup")}
                 className="ml-[6px] font-bold text-[#111827] hover:underline cursor-pointer focus:outline-none"
              >
                Edit
              </button>
            </span>
          </p>
        )}
      </div>

      <form onSubmit={handleVerify} className="space-y-[24px]">
        {/* OTP Input Boxes */}
        <div className="w-full">
          <div className="flex justify-between sm:gap-[4px] md:gap-[8px] items-center w-full" onPaste={handlePaste}>
            {digits.map((digit, i) => (
               <React.Fragment key={i}>
                 {i === 4 && <span className="text-[#D1D5DB] text-[20px] font-light mx-[2px]">-</span>}
                 <input
                   ref={(el) => (inputRefs.current[i] = el)}
                   id={`otp-digit-${i}`}
                   type="text"
                   inputMode="numeric"
                   maxLength={1}
                   value={digit}
                   onChange={(e) => handleDigitChange(i, e.target.value)}
                   onKeyDown={(e) => handleKeyDown(i, e)}
                   className={`
                      flex-1 max-w-[32px] sm:max-w-[36px] md:max-w-[40px] aspect-4/5 text-center text-[16px] md:text-[18px] font-medium rounded-[8px] border-[1.5px] bg-white transition-all px-0
                      focus:outline-none focus:border-[#374151]
                      ${isWrongOtp ? "border-[#DC2626] text-[#DC2626]" : "border-[#D1D5DB] text-[#111827]"}
                   `}
                   autoFocus={i === 0}
                 />
               </React.Fragment>
            ))}
          </div>

          {/* Error Message */}
          {isWrongOtp && (
            <div className="mt-[12px] animate-fade-in">
               <p className="text-[13px] font-bold text-[#DC2626]">
                 Invalid OTP! 2 attempts remaining
               </p>
            </div>
          )}
          {!isWrongOtp && error && (
            <div className="mt-[12px] animate-fade-in">
               <p className="text-[13px] font-bold text-[#DC2626]">
                 {error}
               </p>
            </div>
          )}

          {/* Locked state */}
          {isLocked && (
            <div className="mt-[12px] border border-red-200 bg-red-50 px-4 py-3 animate-fade-in">
              <p className="text-[11px] uppercase tracking-[0.1em] text-red-600">
                All 5 resend attempts used. Priority locked.
              </p>
            </div>
          )}
        </div>
        
        {/* Timer / Resend Row */}
        {!isLocked && (
          <div className="flex flex-col gap-[6px]">
              <p className="text-[13px] text-[#9CA3AF] font-normal">
                OTP valid for <span className="text-[#111827] font-bold tabular-nums font-mono">{otpSecondsLeft === 0 ? "00:00" : formatTime(otpSecondsLeft)}</span>
              </p>
              
              <button
                 type="button"
                 onClick={handleResend}
                 disabled={resending || otpSecondsLeft > 0 || remainingResends <= 0}
                 className={`text-[14px] text-left w-fit transition-all ${
                   otpSecondsLeft > 0 
                       ? "text-[#D1D5DB] cursor-default text-[13px]" 
                       : "text-[#111827] font-bold hover:underline cursor-pointer"
                 }`}
              >
                {resending ? "Sending…" : "Resend OTP"}
              </button>
          </div>
        )}

        {/* Info Note */}
        <div className="pt-[40px] md:pt-[60px]">
            <p className="text-[12px] text-[#9CA3AF] text-left leading-relaxed">
               {DOOR_NOTES[doorRole] || NO_DOOR_NOTE}
            </p>
        </div>

        {/* Continue Button */}
        <div>
          <button
             type="submit"
             id="otp-verify-btn"
             disabled={!otpComplete || verifying}
             className="w-full h-[48px] bg-[#1F2937] hover:bg-[#111827] text-white text-[14px] font-bold rounded-[12px] flex items-center justify-center transition-colors disabled:opacity-70 disabled:cursor-not-allowed border-none shadow-sm"
          >
            {verifying ? "Verifying..." : "Continue"}
          </button>
        </div>

        {/* Terms Footer */}
        <div>
            <p className="text-[12px] text-[#9CA3AF] text-left">
               By continuing, you agree to our <a href="#" className="underline text-[#111827] hover:text-black">Terms of Service</a> and <a href="#" className="underline text-[#111827] hover:text-black">Privacy Policy</a>.
            </p>
        </div>
      </form>
    </div>
  );
}
