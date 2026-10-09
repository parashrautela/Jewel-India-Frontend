"use client";

import { useState, useEffect } from "react";
import { useRetailerOnboard } from "../../../context/RetailerOnboardContext";
import { useInviteCode } from "../../../lib/hooks/useInviteCode";
import { RetailerDocumentUpload } from "./RetailerDocumentUpload";
import { RetailerStep3Footer } from "./RetailerStep3Footer";

export function RetailerStep3Container() {
  const {
    panFile, setPanFile,
    gstFile, setGstFile,
    submitError,
  } = useRetailerOnboard();
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // The invitation code normally arrives from the entry page (sessionStorage);
  // a retailer who opened onboarding in a fresh tab types it here instead.
  // null until sessionStorage has been read.
  const [storedCode, setStoredCode] = useState(null);
  const [typedCode, setTypedCode] = useState("");
  const invite = useInviteCode(typedCode);

  useEffect(() => {
    // Read after mount so the server and client render the same thing first.
    const timer = setTimeout(() => {
      setStoredCode((sessionStorage.getItem("referral_code") || "").trim().toUpperCase());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const showCodeField = storedCode === "";
  const referralCode = storedCode || typedCode.trim().toUpperCase();

  const isFormValid = panFile !== null && gstFile !== null;

  function inviteStatusLine() {
    if (invite.status === "checking") return { text: "Checking your code…", className: "text-[#9CA3AF]" };
    if (invite.status === "valid") return { text: `Invited by ${invite.wholesalerName}`, className: "text-[#166534]" };
    if (invite.status === "invalid") return { text: invite.message, className: "text-[#DC2626]" };
    return null;
  }

  const statusLine = inviteStatusLine();

  return (
    <div className="flex flex-col gap-8 w-full mt-10">
      <RetailerDocumentUpload
        panFile={panFile} setPanFile={setPanFile}
        gstFile={gstFile} setGstFile={setGstFile}
        submitAttempted={submitAttempted}
      />

      {showCodeField && (
        <div className="flex flex-col gap-2 w-full">
          <label htmlFor="retailer-invite-code" className="text-[13px] font-bold text-[#111827]">
            Invitation code
          </label>
          <input
            id="retailer-invite-code"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="The code your wholesaler sent you"
            value={typedCode}
            onChange={(e) => setTypedCode(e.target.value.toUpperCase())}
            className="w-full h-[48px] border-[1.5px] border-[#E5E7EB] rounded-[8px] bg-white px-[14px] text-[15px] text-[#111827] font-mono tracking-[0.12em] placeholder:font-sans placeholder:tracking-normal focus:outline-none focus:border-[#374151] transition-all"
          />
          <p className={`text-[12px] font-medium ${statusLine ? statusLine.className : "text-[#9CA3AF]"}`}>
            {statusLine ? statusLine.text : "Retailers are verified on a wholesaler's invitation. Required for a new application."}
          </p>
        </div>
      )}

      <div className="mt-8 w-full">
        {submitError && (
          <div className="mb-4 p-4 bg-red-50 text-red-600 border border-red-200 rounded-[10px] text-sm font-medium">
            {submitError}
          </div>
        )}
        <RetailerStep3Footer
          isFormValid={isFormValid}
          referralCode={referralCode}
          onSubmitAttempt={() => setSubmitAttempted(true)}
        />
      </div>
    </div>
  );
}
