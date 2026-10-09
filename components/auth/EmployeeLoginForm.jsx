"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "../../lib/actions/auth";
import { initiateGoogleOAuth, initiateAppleOAuth } from "../../lib/actions/oauth";

// Staff usernames look like an email on this domain and are only usernames;
// the store may have handed out just the part before the @.
const STAFF_USERNAME_DOMAIN = "jewelindia.shop";

function errorFromParams(urlError) {
  if (!urlError) return null;
  if (urlError === "deactivated") {
    return "Your account has been deactivated by the store administrator.";
  }
  try {
    return decodeURIComponent(urlError);
  } catch {
    return urlError;
  }
}

const labelStyle = {
  fontSize: "13px",
  color: "#6B7280",
  fontWeight: 500,
  letterSpacing: "0.01em",
};

export function EmployeeLoginForm() {
  const searchParams = useSearchParams();
  const [error, setError] = useState(() => errorFromParams(searchParams.get("error")));
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const isFormValid = username.trim() !== "" && password.trim() !== "";

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.target);
    const typed = username.trim().toLowerCase();
    // signIn reads "email"; append the domain when only the username was typed.
    formData.set("email", typed.includes("@") ? typed : `${typed}@${STAFF_USERNAME_DOMAIN}`);

    const result = await signIn(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // On success, signIn server action redirects to /dashboard/employee
  }

  async function handleGoogle() {
    setError(null);
    setGoogleLoading(true);
    // ?staff=1 tells the callback to match this Google address against the
    // store's invitations instead of asking which door they came through.
    const result = await initiateGoogleOAuth(`${window.location.origin}/auth/callback?staff=1`);
    if (result?.error) {
      setError(result.error);
      setGoogleLoading(false);
    }
  }

  async function handleApple() {
    setError(null);
    setAppleLoading(true);
    const result = await initiateAppleOAuth(`${window.location.origin}/auth/callback?staff=1`);
    if (result?.error) {
      setError(result.error);
      setAppleLoading(false);
    }
  }

  return (
    <form
      className="flex flex-col w-full"
      onSubmit={handleSubmit}
      style={{ fontFamily: "'Gilroy', 'SF Pro', system-ui, sans-serif" }}
    >
      {/* Heading */}
      <div className="w-full flex justify-center mb-[72px]">
        <h1
          className="text-[#111111] text-left text-[1.6rem] md:text-[1.8rem] lg:text-[2.5rem]"
          style={{
            fontFamily: "Georgia, 'Bodoni Moda', serif",
            fontWeight: 400,
            lineHeight: 1.15,
            letterSpacing: "-0.01em",
          }}
        >
          The catalogue
          <br />
          is waiting.
        </h1>
      </div>

      {/* Username */}
      <div className="flex flex-col gap-1.5 mb-[24px]">
        <label htmlFor="emp-username" style={labelStyle}>
          Username
        </label>
        <input
          id="emp-username"
          name="username"
          type="text"
          placeholder="Enter"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="employee-login-input w-full h-[48px] border-[1.5px] border-[#E5E7EB] rounded-[6px] px-[14px] text-[15px] text-[#111827] bg-white outline-none transition-colors focus:border-[#111]"
        />
        <span style={{ fontSize: "12px", color: "#9CA3AF" }}>
          The username your store owner gave you, with or without @{STAFF_USERNAME_DOMAIN}.
        </span>
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5 mb-[24px]">
        <label htmlFor="emp-password" style={labelStyle}>
          Password
        </label>
        <div style={{ position: "relative" }}>
          <input
            id="emp-password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full h-[48px] border-[1.5px] border-[#E5E7EB] rounded-[6px] pl-[14px] pr-[44px] text-[15px] text-[#111827] bg-white outline-none transition-colors focus:border-[#111]"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            style={{
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#9CA3AF",
            }}
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <svg
                width="20"
                height="20"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                />
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <circle cx="12" cy="12" r="3" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.638 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                />
              </svg>
            )}
          </button>
        </div>
        <span style={{ fontSize: "12px", color: "#9CA3AF" }}>
          Forgot your password? Your store owner can reset it.
        </span>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 14px",
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: "8px",
            marginBottom: "16px",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#EF4444",
              flexShrink: 0,
            }}
          />
          <p style={{ fontSize: "13px", color: "#DC2626", margin: 0 }}>
            {error}
          </p>
        </div>
      )}

      {/* Get Started Button */}
      <button
        type="submit"
        id="employee-login-btn"
        disabled={loading || !isFormValid}
        className={`w-full flex items-center justify-center text-center font-semibold tracking-[0.02em] rounded-[8px] transition-all duration-200 h-[44px] text-[15px] ${
          loading || !isFormValid
            ? "bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed"
            : "bg-black text-white cursor-pointer hover:bg-[#222222] hover:shadow-md"
        }`}
      >
        {loading ? "Signing in..." : "Get Started"}
      </button>

      {/* OR Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "20px 0" }}>
        <div style={{ flex: 1, height: "1px", background: "#E5E7EB" }} />
        <span style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, letterSpacing: "0.05em" }}>OR</span>
        <div style={{ flex: 1, height: "1px", background: "#E5E7EB" }} />
      </div>

      {/* Google — for staff the store invited by their Google address */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={googleLoading || appleLoading}
        className="w-full h-[44px] flex items-center justify-center gap-[10px] border-[1.5px] border-[#E5E7EB] rounded-[8px] bg-white text-[14px] font-medium text-[#111827] transition-colors hover:bg-[#F9FAFB] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M47.52 24.552c0-1.636-.148-3.21-.424-4.728H24v8.948h13.204c-.568 3.068-2.292 5.668-4.884 7.412v6.16h7.908C44.164 38.028 47.52 31.836 47.52 24.552z" fill="#4285F4"/>
          <path d="M24 48c6.636 0 12.204-2.2 16.268-5.968l-7.908-6.16c-2.196 1.472-5.004 2.34-8.36 2.34-6.428 0-11.872-4.34-13.824-10.172H2.04v6.36C6.084 42.916 14.46 48 24 48z" fill="#34A853"/>
          <path d="M10.176 28.04A14.41 14.41 0 0 1 9.6 24c0-1.404.24-2.768.576-4.04v-6.36H2.04A23.956 23.956 0 0 0 0 24c0 3.864.928 7.516 2.04 10.4l8.136-6.36z" fill="#FBBC05"/>
          <path d="M24 9.552c3.624 0 6.872 1.248 9.428 3.696l7.076-7.076C36.196 2.392 30.628 0 24 0 14.46 0 6.084 5.084 2.04 13.6l8.136 6.36C12.128 13.892 17.572 9.552 24 9.552z" fill="#EA4335"/>
        </svg>
        {googleLoading ? "Redirecting..." : "Continue with Google"}
      </button>
      <button
        type="button"
        onClick={handleApple}
        disabled={googleLoading || appleLoading}
        className="w-full h-[44px] mt-[10px] flex items-center justify-center rounded-[8px] bg-black text-white text-[14px] font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {appleLoading ? "Redirecting..." : "Continue with Apple"}
      </button>
      <p style={{ fontSize: "12px", color: "#9CA3AF", margin: "10px 0 0", lineHeight: 1.5 }}>
        Use the email address your store invited. For Apple, choose Share My Email.
      </p>
    </form>
  );
}
