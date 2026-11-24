"use client";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export function OnboardNavbar({ backRoute }) {
  const router = useRouter();

  const handleBack = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(backRoute || '/signup');
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/signup');
  };

  return (
    <header className="w-full bg-[#FFFFFF] border-b border-[#E0E0E0] [.theme-retailer_&]:border-b-0 [.theme-retailer_&]:shadow-none [.theme-retailer_&]:bg-[#fefefe] px-[clamp(16px,3vw,48px)] py-[clamp(6px,0.8vw,12px)] flex items-center justify-between shadow-sm z-10">
      <button
        onClick={handleBack}
        className="flex items-center gap-2 hover:bg-gray-100 transition-colors px-3 py-1.5 rounded-full [.theme-retailer_&]:bg-[#eaeaea] [.theme-retailer_&]:rounded-[8px] [.theme-retailer_&]:pl-[4px] [.theme-retailer_&]:pr-[8px] [.theme-retailer_&]:py-[8px] [.theme-retailer_&]:gap-[4px]"
      >
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-[clamp(14px,1.5vw,16px)] h-[clamp(14px,1.5vw,16px)] text-[#374151]">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="text-[#374151] font-medium text-[clamp(12px,1.4vw,14px)] tracking-wide [.theme-retailer_&]:text-[16px] [.theme-retailer_&]:text-[#545454] [.theme-retailer_&]:tracking-normal">Back</span>
      </button>

      <button
        onClick={handleSignOut}
        className="flex items-center gap-2 hover:bg-gray-100 transition-colors px-3 py-1.5 rounded-full text-[#374151] font-medium text-[clamp(12px,1.4vw,14px)] tracking-wide cursor-pointer"
      >
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-[clamp(14px,1.5vw,16px)] h-[clamp(14px,1.5vw,16px)] text-[#374151]">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        Sign out
      </button>
    </header>
  );
}