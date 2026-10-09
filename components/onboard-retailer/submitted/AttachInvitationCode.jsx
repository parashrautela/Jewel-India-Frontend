"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { attachReferralCode } from "../../../lib/actions/referral";
import { useInviteCode } from "../../../lib/hooks/useInviteCode";

/**
 * Shown on the "submitted" page to a pending retailer with no inviter yet.
 * Nobody is verified without one, so the application waits on this box.
 */
export function AttachInvitationCode() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const invite = useInviteCode(code);

  async function handleAttach() {
    if (invite.status !== "valid") {
      setError(invite.status === "invalid" ? invite.message : "Enter your invitation code.");
      return;
    }
    setSaving(true);
    setError(null);

    const result = await attachReferralCode(invite.code);
    if (result?.error) {
      setError(result.error);
      setSaving(false);
      return;
    }
    // The page re-reads the row and drops this box once referred_by is set.
    router.refresh();
  }

  function statusLine() {
    if (invite.status === "checking") return { text: "Checking your code…", className: "text-amber-900/60" };
    if (invite.status === "valid") return { text: `Invited by ${invite.wholesalerName}`, className: "text-[#166534]" };
    if (invite.status === "invalid") return { text: invite.message, className: "text-[#DC2626]" };
    return null;
  }

  const status = statusLine();

  return (
    <div className="w-full max-w-[500px] mt-6 p-5 bg-amber-50/60 border border-amber-200/70 rounded-2xl flex flex-col gap-4 text-left">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-100/80 text-amber-700 rounded-xl mt-0.5 shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <div>
          <h4 className="text-[14.5px] font-bold text-amber-950">Add your invitation code</h4>
          <p className="text-[13.5px] text-amber-900/80 mt-1 leading-relaxed">
            Retailers are verified on a wholesaler&apos;s invitation. Enter the code you were sent and we can approve your application.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <input
          id="attach-invite-code"
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="The code your wholesaler sent you"
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAttach(); } }}
          className="w-full h-[48px] border-[1.5px] border-amber-200 rounded-[10px] bg-white px-[14px] text-[15px] text-[#111827] font-mono tracking-[0.12em] placeholder:font-sans placeholder:tracking-normal focus:outline-none focus:border-amber-500 transition-all"
        />
        {status && (
          <p className={`text-[12px] font-medium ${status.className}`}>{status.text}</p>
        )}
        {error && (
          <p className="text-[12px] font-medium text-[#DC2626]">{error}</p>
        )}
      </div>

      <button
        type="button"
        onClick={handleAttach}
        disabled={saving || invite.status !== "valid"}
        className="w-full md:w-auto self-end bg-[#000000] text-white font-extrabold rounded-[10px] px-8 py-3 text-[14px] hover:bg-black/90 transition-colors disabled:bg-[#D1D5DB] disabled:cursor-not-allowed"
      >
        {saving ? "Adding..." : "Add code"}
      </button>
    </div>
  );
}
