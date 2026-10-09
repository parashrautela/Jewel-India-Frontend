"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "../../lib/actions/auth";
import { initiateGoogleOAuth, initiateAppleOAuth } from "../../lib/actions/oauth";

export function SignInForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlError = searchParams.get("error");
  const urlIdentity = searchParams.get("identity");

  let decodedUrlError = null;
  if (urlError) {
    try { decodedUrlError = decodeURIComponent(urlError); }
    catch { decodedUrlError = urlError; }
  }

  const [error, setError] = useState(decodedUrlError);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);
  const [identity, setIdentity] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Restore identity from URL param or sessionStorage
  useEffect(() => {
    if (urlIdentity) {
      setIdentity(decodeURIComponent(urlIdentity));
      return;
    }
    const stored = sessionStorage.getItem("auth_identity");
    if (stored) setIdentity(stored);
  }, [urlIdentity]);

  // If no identity at all, redirect back to entry
  useEffect(() => {
    if (!urlIdentity) {
      const stored = sessionStorage.getItem("auth_identity");
      if (!stored) {
        router.replace("/entry_page/signup");
      }
    }
  }, [urlIdentity, router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.target);
    // Inject the identity as email (server action uses "email" field)
    formData.set("email", identity);

    const result = await signIn(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // On success, signIn server action redirects to /dashboard/wholesaler
  }

  async function handleSocial(provider) {
    setError(null);
    setSocialLoading(provider);
    const redirectTo = `${window.location.origin}/auth/callback`;
    const result = provider === "google"
      ? await initiateGoogleOAuth(redirectTo)
      : await initiateAppleOAuth(redirectTo);
    if (result?.error) {
      setError(result.error);
      setSocialLoading(null);
    }
  }

  const [rememberMe, setRememberMe] = useState(false);
  const isPhone = identity.length > 0 && /^\d+$/.test(identity);

  return (
    <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit}>
      {/* Email / Phone Field - Read Only Display */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[13.5px] text-[#6B7280] font-normal">
          Email or Phone number
        </label>
        <div className="flex h-[48px] w-full items-center justify-between px-[12px] border-[1.5px] border-[#E5E7EB] bg-[#F9FAFB] rounded-[8px] transition-colors">
          <div className="flex items-center gap-2 overflow-hidden">
            {isPhone && (
              <span className="text-[#111827] text-[15px] font-medium shrink-0">
                +91
              </span>
            )}
            <span className="text-[15px] text-[#111827] font-medium truncate">
              {identity}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem("auth_identity");
              router.push("/entry_page/signup");
            }}
            className="text-[13px] text-[#374151] font-semibold hover:text-black hover:underline shrink-0"
          >
            Change
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="password"
          className="text-[13.5px] text-[#6B7280] font-normal"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            required
            className="h-[48px] w-full border-[1.5px] border-[#E5E7EB] bg-white rounded-[8px] px-[12px] pr-[40px] text-[15px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none transition-colors"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors flex items-center justify-center w-5 h-5 focus:outline-none"
            tabIndex={-1}
          >
            {showPassword ? (
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            ) : (
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.638 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Forgot password */}
      <div className="flex items-center -mt-[4px]">
        <Link
          href="/forgot-password"
          className="text-[13px] text-[#374151] font-normal hover:underline focus:outline-none"
        >
          Forgot Password?
        </Link>
      </div>

      {/* Remember me row */}
      <div className="flex items-center gap-[8px]">
        <input
           type="checkbox"
           id="rememberMe"
           checked={rememberMe}
           onChange={(e) => setRememberMe(e.target.checked)}
           className="h-[14px] w-[14px] rounded-[3px] border border-[#E5E7EB] text-[#1F2937] focus:ring-1 focus:ring-[#1F2937] bg-white cursor-pointer"
        />
        <label htmlFor="rememberMe" className="text-[14px] text-[#6B7280] font-normal cursor-pointer select-none">
          Remember me
        </label>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 animate-fade-in -mt-[4px]">
          <span className="shrink-0 w-1 h-1 rounded-full bg-red-500 mt-1.5" />
          <p className="text-[12px] text-red-600">{error}</p>
        </div>
      )}

      {/* Continue Button */}
      <div className="pt-2">
        <button
          type="submit"
          id="signin-btn"
          disabled={loading}
          className="w-full h-[48px] bg-[#1F2937] hover:bg-[#111827] text-white text-[14px] font-bold rounded-[12px] flex items-center justify-center transition-colors disabled:opacity-70 disabled:cursor-not-allowed border-none"
        >
          {loading ? "Signing in..." : "Continue"}
        </button>
      </div>

      <div className="text-center text-[11px] text-[#9CA3AF]">OR</div>
      <button type="button" onClick={() => handleSocial("google")} disabled={loading || socialLoading !== null} className="w-full h-[48px] border border-[#E5E7EB] rounded-[8px] bg-white text-[14px] font-medium disabled:opacity-60">
        {socialLoading === "google" ? "Redirecting..." : "Continue with Google"}
      </button>
      <button type="button" onClick={() => handleSocial("apple")} disabled={loading || socialLoading !== null} className="w-full h-[48px] rounded-[8px] bg-black text-white text-[14px] font-semibold disabled:opacity-60">
        {socialLoading === "apple" ? "Redirecting..." : "Continue with Apple"}
      </button>

      {/* Terms Footer */}
      <div className="text-center mt-4">
        <p className="text-[12px] text-[#9CA3AF]">
          By continuing, you agree to our <a href="#" className="underline text-[#374151] hover:text-[#111827]">Terms of Service</a> and <a href="#" className="underline text-[#374151] hover:text-[#111827]">Privacy Policy</a>.
        </p>
      </div>
    </form>
  );
}
