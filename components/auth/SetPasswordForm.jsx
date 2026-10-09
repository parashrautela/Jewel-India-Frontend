"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const CHOOSABLE_ROLES = ["wholesaler", "retailer"];

// What happens after this step depends on the door the person chose.
const DOOR_NOTES = {
  wholesaler: "Wholesaler accounts are verified by our team before they go live.",
  retailer: "Retailer accounts join on a wholesaler's invitation and are verified before they go live.",
};
const NO_DOOR_NOTE = "You'll choose how you use Jewels India after this step.";

const RULES = [
  { id: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { id: "upper", label: "1 uppercase letter (A–Z)", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "1 lowercase letter (a–z)", test: (p) => /[a-z]/.test(p) },
  { id: "special", label: "1 number (0–9) and 1 special character (!@#$%^&*...)", test: (p) => /[0-9]/.test(p) && /[!@#$%^&*()\-_=+[\]{};:'",.<>/?\\|`~]/.test(p) },
];
export function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const doorRole = CHOOSABLE_ROLES.includes(searchParams.get("role")) ? searchParams.get("role") : null;
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const allRulesPassed = RULES.every((r) => r.test(password));
  const passwordsMatch = password === confirm;
  const canSubmit = allRulesPassed && passwordsMatch && password.length > 0;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    // The door chosen on the entry page; nothing is assumed when there is none.
    const storedRole = sessionStorage.getItem("referral_role");
    const role = doorRole || (CHOOSABLE_ROLES.includes(storedRole) ? storedRole : null);

    const res = await fetch("/api/auth/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, role }),
    });
    const data = await res.json();

    if (!res.ok || data.error) {
      setError(data.error || "Failed to set password. Please try again.");
      setLoading(false);
      return;
    }

    // Clean up session storage
    sessionStorage.removeItem("auth_identity");
    sessionStorage.removeItem("otp_sent_at");
    sessionStorage.removeItem("otp_remaining_resends");
    sessionStorage.removeItem("otp_locked_until");

    const redirectDest =
      role === "retailer" ? "/onboard-retailer" : role === "wholesaler" ? "/onboard" : "/select-role";
    router.push(redirectDest);
  }

  return (
    <div className="text-left w-full max-w-[400px]">
      {/* Subtitle */}
      <div className="mb-[16px] xl:mb-[20px]">
        <p className="text-[13px] md:text-[13px] xl:text-[14px] text-[#6B7280] font-normal leading-[1.5] xl:leading-[1.6]">
          Password must contain at least 8 characters and include a capital letter, a small letter, a number and a special character
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col">
        {/* Password */}
        <div className="mb-[16px] xl:mb-[20px] flex flex-col">
          <label
            htmlFor="password"
            className="text-[13px] xl:text-[14px] text-[#6B7280] mb-[6px] xl:mb-[6px] normal-case"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              placeholder="••••••••••"
              className="w-full h-[44px] md:h-[44px] xl:h-[48px] border-[1.5px] border-[#E5E7EB] rounded-[8px] bg-white px-[14px] md:px-[14px] xl:px-[16px] pr-10 text-[14px] xl:text-[15px] text-[#111827] focus:outline-none focus:border-[#374151] transition-all"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-[10px] xl:right-[12px] top-1/2 -translate-y-1/2 focus:outline-none"
              tabIndex={-1}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-[18px] h-[18px] xl:w-[20px] xl:h-[20px] text-[#9CA3AF]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-[18px] h-[18px] xl:w-[20px] xl:h-[20px] text-[#9CA3AF]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Confirm password */}
        <div className="mb-[20px] xl:mb-[24px] flex flex-col">
          <label
            htmlFor="confirm"
            className="text-[13px] xl:text-[14px] text-[#6B7280] mb-[6px] xl:mb-[6px] normal-case"
          >
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirm"
              type={showConfirm ? "text" : "password"}
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(null); }}
              placeholder="••••••••••"
              className="w-full h-[44px] md:h-[44px] xl:h-[48px] border-[1.5px] border-[#E5E7EB] rounded-[8px] bg-white px-[14px] md:px-[14px] xl:px-[16px] pr-10 text-[14px] xl:text-[15px] text-[#111827] focus:outline-none focus:border-[#374151] transition-all"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-[10px] xl:right-[12px] top-1/2 -translate-y-1/2 focus:outline-none"
              tabIndex={-1}
            >
              {showConfirm ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-[18px] h-[18px] xl:w-[20px] xl:h-[20px] text-[#9CA3AF]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-[18px] h-[18px] xl:w-[20px] xl:h-[20px] text-[#9CA3AF]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              )}
            </button>
          </div>
          {confirm && !passwordsMatch && (
            <p className="text-[12px] text-[#DC2626] mt-2 animate-fade-in font-medium">
              Passwords do not match
            </p>
          )}
        </div>

        {/* Password rules checklist */}
        <div className="flex flex-col gap-[8px] xl:gap-[10px] mt-[4px] mb-[20px] xl:mb-[24px]">
          {RULES.map((rule) => {
            const passed = rule.test(password);
            return (
              <div key={rule.id} className="flex items-center gap-[6px] xl:gap-[8px]">
                {passed ? (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[14px] h-[14px] xl:w-[16px] xl:h-[16px] shrink-0">
                    <circle cx="8" cy="8" r="8" fill="#16A34A" />
                    <path d="M4.5 8.5L7 11L12.5 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[14px] h-[14px] xl:w-[16px] xl:h-[16px] shrink-0">
                    <circle cx="8" cy="8" r="7" stroke="#D1D5DB" strokeWidth="1.5" />
                  </svg>
                )}
                <p
                  className={`text-[12px] xl:text-[13px] transition-colors duration-300 ${passed ? "text-[#16A34A]" : "text-[#6B7280]"
                    }`}
                >
                  {rule.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* API Error */}
        {error && (
          <div className="flex items-start gap-2 mb-4 animate-fade-in">
            <p className="text-[12px] text-[#DC2626] font-medium">{error}</p>
          </div>
        )}

        {/* Info Note */}
        <div className="mt-[24px] md:mt-[48px] xl:mt-[40px] mb-[16px] xl:mb-[20px]">
          <p className="text-[12px] text-[#9CA3AF] leading-relaxed">
            {DOOR_NOTES[doorRole] || NO_DOOR_NOTE}
          </p>
        </div>

        {/* Continue Button */}
        <div className="mb-[12px] xl:mb-[16px]">
          <button
            type="submit"
            id="set-password-btn"
            disabled={!canSubmit || loading}
            className="w-full h-[48px] xl:h-[52px] bg-[#1F2937] hover:bg-[#111827] text-white text-[14px] xl:text-[15px] font-semibold rounded-[10px] xl:rounded-[12px] flex items-center justify-center transition-colors disabled:opacity-70 disabled:cursor-not-allowed border-none shadow-sm"
          >
            {loading ? "Verifying..." : "Continue"}
          </button>
        </div>

        {/* Terms Footer */}
        <div>
          <p className="text-[12px] text-[#9CA3AF] text-left">
            By continuing, you agree to our <a href="#" className="underline text-[#374151] hover:text-black">Terms of Service</a> and <a href="#" className="underline text-[#374151] hover:text-black">Privacy Policy</a>.
          </p>
        </div>

      </form>
    </div>
  );
}
