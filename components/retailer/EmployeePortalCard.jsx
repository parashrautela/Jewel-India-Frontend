"use client";

import { useState, useEffect } from "react";
import { ArrowCircle, statCard, statTitle } from "./DashboardStats";

/**
 * EmployeePortalCard — Displayed on the retailer dashboard.
 * Shows the employee login URL that the retailer can copy and share
 * with employees so they can sign in through the dedicated login page.
 */
export default function EmployeePortalCard() {
  const [copied, setCopied] = useState(false);
  const [portalUrl, setPortalUrl] = useState("");

  useEffect(() => {
    // Build the employee login URL from current origin
    const origin = window.location.origin;
    const timer = setTimeout(() => {
      setPortalUrl(`${origin}/employee-login`);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Display-friendly URL (strip protocol)
  const displayUrl = portalUrl.replace(/^https?:\/\//, "");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = portalUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpen = () => {
    window.open(portalUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className={statCard}>
      <div className="flex items-start justify-between">
        <h3 className={statTitle}>Employee portal</h3>
        <ArrowCircle onClick={handleOpen} label="Open employee login page in new tab" />
      </div>

      <div>
        <div className="flex items-center justify-between gap-3 h-[56px] max-w-[304px] bg-[#fafafa] border border-[#ededed] rounded-[8px] pl-[21px] pr-[18px] -ml-[3px]">
          <span className="text-[16px] font-semibold text-black truncate">
            {displayUrl || "Loading..."}
          </span>
          <button
            onClick={handleCopy}
            className="shrink-0 transition-opacity hover:opacity-70"
            title={copied ? "Copied!" : "Copy URL"}
            aria-label="Copy employee portal URL"
          >
            {copied ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <img src="/retailer-admin/copy.svg" alt="" width={24} height={24} />
            )}
          </button>
        </div>
        <p className="text-[14px] font-medium tracking-[-0.28px] text-[#999] mt-[10px] truncate">
          Employee access for catalogue and order management.
        </p>
      </div>
    </div>
  );
}
