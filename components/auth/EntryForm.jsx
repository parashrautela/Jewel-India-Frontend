"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { initiateGoogleOAuth, initiateAppleOAuth } from "../../lib/actions/oauth";
import { validateIndianMobile } from "../../lib/utils/credentials";
import { useInviteCode } from "../../lib/hooks/useInviteCode";

// The three doors. Staff never sign up here: their login comes from the store.
const DOORS = [
  { value: "wholesaler", label: "I'm a wholesaler", hint: "Upload your catalogue and invite retailers" },
  { value: "retailer", label: "I'm a retailer", hint: "Source designs with an invitation from a wholesaler" },
  { value: "staff", label: "I work at a store", hint: "Sign in with the login your store owner gave you" },
];

const DOOR_CAPTIONS = {
  wholesaler: "Wholesaler account",
  retailer: "Retailer account",
  signin: "Sign in to your account",
};

function errorFromParams(urlError) {
  if (!urlError) return null;
  if (urlError === "banned") {
    return "Your account has been banned. Please use a different number or email.";
  }
  try {
    return decodeURIComponent(urlError);
  } catch {
    return urlError;
  }
}

const labelStyle = { display: "block", fontSize: "13px", fontWeight: 600, color: "#333333", marginBottom: "8px", letterSpacing: "0.01em" };

const inputStyle = {
  width: "100%",
  height: "52px",
  border: "1.5px solid #D9D0C5",
  borderRadius: "8px",
  padding: "0 14px",
  fontSize: "14px",
  color: "#111111",
  background: "#FAFAFA",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
  marginBottom: "20px",
};

const linkButtonStyle = { background: "none", border: "none", padding: 0, fontWeight: 700, color: "#333333", cursor: "pointer", textDecoration: "underline", fontSize: "inherit" };

function primaryButtonStyle(disabled) {
  return {
    width: "100%",
    height: "56px",
    background: disabled ? "#BBBBBB" : "#1A1A1A",
    color: "#FFFFFF",
    borderRadius: "8px",
    border: "none",
    fontSize: "15px",
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    letterSpacing: "0.02em",
    transition: "background 0.2s",
    marginBottom: "16px",
  };
}

export function EntryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // /join/[code] lands here with ?ref=CODE&role=retailer: open that door with the code filled in.
  const paramRole = searchParams.get("role");
  const paramRef = (searchParams.get("ref") || "").trim().toUpperCase();
  const initialDoor = paramRole === "retailer" || paramRole === "wholesaler" ? paramRole : null;

  const [door, setDoor] = useState(initialDoor); // null | wholesaler | retailer | signin
  const [inviteCode, setInviteCode] = useState(paramRef);
  const [codeConfirmed, setCodeConfirmed] = useState(false);
  const [identity, setIdentity] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [error, setError] = useState(() => errorFromParams(searchParams.get("error")));

  // Checked live as it is typed; the retailer door only opens on a live code.
  const invite = useInviteCode(door === "retailer" ? inviteCode : "");

  // Remember the door and the code across the OTP and set-password steps.
  useEffect(() => {
    if (paramRef) sessionStorage.setItem("referral_code", paramRef);
    if (initialDoor) sessionStorage.setItem("referral_role", initialDoor);
  }, [paramRef, initialDoor]);

  const chosenRole = door === "wholesaler" || door === "retailer" ? door : null;
  const showIdentity = door === "wholesaler" || door === "signin" || (door === "retailer" && codeConfirmed);
  const showInviteStep = door === "retailer" && !codeConfirmed;

  function chooseDoor(value) {
    setError(null);
    if (value === "staff") {
      router.push("/employee-login");
      return;
    }
    if (value === "signin") sessionStorage.removeItem("referral_role");
    else sessionStorage.setItem("referral_role", value);
    setDoor(value);
  }

  function backToDoors() {
    setError(null);
    setCodeConfirmed(false);
    setDoor(null);
  }

  function confirmInvite() {
    if (invite.status !== "valid") return;
    sessionStorage.setItem("referral_code", invite.code);
    sessionStorage.setItem("referral_role", "retailer");
    setError(null);
    setCodeConfirmed(true);
  }

  // Where Google sends the browser back; /auth/callback records the door from these.
  function callbackUrl() {
    const url = new URL("/auth/callback", window.location.origin);
    if (chosenRole) url.searchParams.set("role", chosenRole);
    if (door === "retailer" && invite.status === "valid") url.searchParams.set("ref", invite.code);
    return url.toString();
  }

  async function handleContinue(e) {
    e.preventDefault();
    if (!showIdentity || !identity.trim()) return;

    setError(null);
    setLoading(true);

    let normalizedIdentity = identity.trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedIdentity);

    if (!isEmail) {
      const mobileCheck = validateIndianMobile(normalizedIdentity);
      if (!mobileCheck.valid) {
        setError("Please enter a valid 10-digit Indian mobile number.");
        setLoading(false);
        return;
      }
      normalizedIdentity = mobileCheck.normalized;
    }

    try {
      const checkRes = await fetch("/api/auth/check-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity: normalizedIdentity }),
      });
      const checkData = await checkRes.json();

      if (!checkRes.ok) {
        setError(checkData.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      if (checkData.exists) {
        if (checkData.provider === "google") {
          setError("You signed up with Google. Redirecting...");
          setGoogleLoading(true);
          const result = await initiateGoogleOAuth(callbackUrl());
          if (result?.error) {
            setError(result.error);
            setGoogleLoading(false);
          }
          return;
        }

        sessionStorage.setItem("auth_identity", normalizedIdentity);
        router.push(`/entry_page/signin?identity=${encodeURIComponent(normalizedIdentity)}`);
        return;
      }

      const otpRes = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity: normalizedIdentity }),
      });
      const otpData = await otpRes.json();

      if (!otpRes.ok) {
        setError(otpData.error || "Failed to send OTP. Please try again.");
        setLoading(false);
        return;
      }

      sessionStorage.setItem("auth_identity", normalizedIdentity);
      sessionStorage.setItem("otp_sent_at", new Date().toISOString());

      // The chosen door rides along to the OTP and set-password steps. Someone
      // who came in through "Sign in" without an account picks a door afterwards.
      router.push(`/entry_page/signup/verify-otp${chosenRole ? `?role=${chosenRole}` : ""}`);
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setGoogleLoading(true);
    const result = await initiateGoogleOAuth(callbackUrl());
    if (result?.error) {
      setError(result.error);
      setGoogleLoading(false);
    }
  }

  async function handleApple() {
    setError(null);
    setAppleLoading(true);
    const result = await initiateAppleOAuth(callbackUrl());
    if (result?.error) {
      setError(result.error);
      setAppleLoading(false);
    }
  }

  function inviteStatusLine() {
    if (invite.status === "checking") return { text: "Checking your code…", color: "#888888" };
    if (invite.status === "valid") return { text: `Invited by ${invite.wholesalerName}`, color: "#166534" };
    if (invite.status === "invalid") return { text: invite.message, color: "#DC2626" };
    return null;
  }

  const statusLine = inviteStatusLine();

  const errorBlock = error && (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "12px" }}>
      <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#EF4444", flexShrink: 0, marginTop: "5px" }} />
      <p style={{ fontSize: "12px", color: "#DC2626", fontWeight: 500, margin: 0 }}>{error}</p>
    </div>
  );

  const backLink = (
    <button
      type="button"
      onClick={backToDoors}
      style={{ background: "none", border: "none", padding: 0, marginBottom: "20px", fontSize: "13px", color: "#888888", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
    >
      <span aria-hidden="true">&larr;</span> Back
    </button>
  );

  return (
    <form style={{ display: "flex", flexDirection: "column", flex: 1 }} onSubmit={handleContinue}>

      {/* ── Door chooser: which of the three are you? ── */}
      {door === null && (
        <div>
          <p style={labelStyle}>How will you use Jewels India?</p>

          {DOORS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => chooseDoor(d.value)}
              style={{
                width: "100%",
                border: "1.5px solid #D9D0C5",
                borderRadius: "8px",
                background: "#FAFAFA",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                padding: "14px 16px",
                marginBottom: "12px",
                cursor: "pointer",
                textAlign: "left",
                transition: "border-color 0.2s, background 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#111111"; e.currentTarget.style.background = "#F5F5F5"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#D9D0C5"; e.currentTarget.style.background = "#FAFAFA"; }}
            >
              <span>
                <span style={{ display: "block", fontSize: "15px", fontWeight: 600, color: "#111111" }}>{d.label}</span>
                <span style={{ display: "block", fontSize: "12px", fontWeight: 400, color: "#888888", marginTop: "3px" }}>{d.hint}</span>
              </span>
              <span aria-hidden="true" style={{ color: "#888888", fontSize: "16px" }}>&rarr;</span>
            </button>
          ))}

          {errorBlock}

          <p style={{ fontSize: "13px", color: "#888888", margin: "12px 0 0" }}>
            Already have an account?{" "}
            <button type="button" onClick={() => chooseDoor("signin")} style={linkButtonStyle}>Sign in</button>
          </p>
        </div>
      )}

      {/* ── Retailer door: the invitation comes first ── */}
      {showInviteStep && (
        <div>
          {backLink}
          <label htmlFor="invite-code" style={labelStyle}>
            Invitation code
          </label>
          <input
            id="invite-code"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="The code your wholesaler sent you"
            value={inviteCode}
            onChange={(e) => { setInviteCode(e.target.value.toUpperCase()); setError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmInvite(); } }}
            style={{ ...inputStyle, marginBottom: "10px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", letterSpacing: "0.12em" }}
            onFocus={(e) => (e.target.style.borderColor = "#111111")}
            onBlur={(e) => (e.target.style.borderColor = "#D9D0C5")}
          />
          {statusLine && (
            <p style={{ fontSize: "12px", color: statusLine.color, fontWeight: 500, margin: "0 0 16px" }}>{statusLine.text}</p>
          )}
          {errorBlock}
          <p style={{ fontSize: "13px", color: "#888888", lineHeight: 1.5, margin: "8px 0 0" }}>
            Retailers join on a wholesaler&apos;s invitation. Don&apos;t have one? Ask the wholesaler you work with.
          </p>
        </div>
      )}

      {/* ── Identity: label, input, error, divider, Google ── */}
      {showIdentity && (
        <div>
          {backLink}
          <p style={{ fontSize: "12px", color: "#888888", margin: "0 0 16px", letterSpacing: "0.02em" }}>
            {DOOR_CAPTIONS[door]}
            {door === "retailer" && invite.status === "valid" && (
              <> &middot; Invited by <span style={{ color: "#111111", fontWeight: 600 }}>{invite.wholesalerName}</span></>
            )}
          </p>

          <label htmlFor="identity" style={labelStyle}>
            Email or Phone number
          </label>

          <input
            id="identity"
            type="text"
            autoComplete="username"
            placeholder="Enter"
            value={identity}
            onChange={(e) => { setIdentity(e.target.value); setError(null); }}
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "#111111")}
            onBlur={(e) => (e.target.style.borderColor = "#D9D0C5")}
            required
          />

          {errorBlock}

          {/* OR Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "16px 0" }}>
            <div style={{ flex: 1, height: "1px", background: "#E0E0E0" }} />
            <span style={{ fontSize: "11px", color: "#999999", fontWeight: 500, letterSpacing: "0.05em" }}>OR</span>
            <div style={{ flex: 1, height: "1px", background: "#E0E0E0" }} />
          </div>

          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || appleLoading}
            style={{
              width: "100%",
              height: "52px",
              border: "1px solid #E0E0E0",
              borderRadius: "8px",
              background: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              fontSize: "14px",
              fontWeight: 500,
              color: "#111111",
              cursor: googleLoading ? "not-allowed" : "pointer",
              opacity: googleLoading ? 0.6 : 1,
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => { if (!googleLoading) e.currentTarget.style.background = "#F5F5F5"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFFFF"; }}
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
            aria-label="Continue with Apple"
            style={{ width: "100%", height: "52px", marginTop: "10px", border: "1px solid #000", borderRadius: "8px", background: "#000", color: "#fff", fontSize: "14px", fontWeight: 600, cursor: googleLoading || appleLoading ? "not-allowed" : "pointer", opacity: googleLoading || appleLoading ? 0.6 : 1 }}
          >
            {appleLoading ? "Redirecting..." : "Continue with Apple"}
          </button>
        </div>
      )}

      {/* ── Flex spacer: pushes Continue button toward the bottom ── */}
      <div style={{ flex: 1 }} />

      {/* ── Bottom anchor: Continue button + Terms ── */}
      <div>
        {showInviteStep && (
          <button
            type="button"
            onClick={confirmInvite}
            disabled={invite.status !== "valid"}
            style={primaryButtonStyle(invite.status !== "valid")}
            onMouseEnter={(e) => { if (invite.status === "valid") e.currentTarget.style.background = "#333333"; }}
            onMouseLeave={(e) => { if (invite.status === "valid") e.currentTarget.style.background = "#1A1A1A"; }}
          >
            {invite.status === "checking" ? "Checking..." : "Continue"}
          </button>
        )}

        {showIdentity && (
          <button
            type="submit"
            disabled={loading || !identity.trim()}
            style={primaryButtonStyle(loading || !identity.trim())}
            onMouseEnter={(e) => { if (!loading && identity.trim()) e.currentTarget.style.background = "#333333"; }}
            onMouseLeave={(e) => { if (!loading && identity.trim()) e.currentTarget.style.background = "#1A1A1A"; }}
          >
            {loading ? "Checking..." : "Continue"}
          </button>
        )}

        <p style={{ fontSize: "13px", color: "#888888", lineHeight: 1.5, margin: "0 0 32px" }}>
          By continuing, you agree to our{" "}
          <span style={{ fontWeight: 700, color: "#333333", cursor: "pointer", textDecoration: "underline" }}>Terms of Service</span>{" "}
          and{" "}
          <span style={{ fontWeight: 700, color: "#333333", cursor: "pointer", textDecoration: "underline" }}>Privacy Policy</span>
        </p>
      </div>
    </form>
  );
}
