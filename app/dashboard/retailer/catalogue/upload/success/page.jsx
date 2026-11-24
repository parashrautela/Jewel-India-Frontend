"use client";

import Link from "next/link";

export default function SuccessPage() {
  return (
    <>
      <style>{`
        aside { display: none !important; }
        main { margin-left: 0 !important; max-width: 100% !important; background: white !important; }
      `}</style>
      
      <div className="bg-white min-h-[calc(100vh-80px)] w-full flex items-center justify-center font-sans">
        
        <div className="flex flex-col items-center justify-center text-center px-4 max-w-[640px]">
          <h1 className="text-[40px] font-bold text-black leading-tight mb-[22px]">
            Design uploaded successfully
          </h1>
          
          <p className="text-[18px] text-[#737373] mb-[36px] max-w-[617px]">
            Your designs will be available to your employees shortly (within a few minutes).
          </p>
          
          <Link
            href="/dashboard/retailer"
            className="flex items-center justify-center w-fit px-[24px] py-[12px] bg-black text-white font-bold text-[16px] rounded-[8px] border border-[#e4cc8f] shadow-[0_4px_4px_rgba(0,0,0,0.25),inset_4px_4px_4px_rgba(228,204,143,0.39)] hover:opacity-90 transition-opacity mb-[24px]"
          >
            Back to dashboard
          </Link>
          
          <Link
            href="/dashboard/retailer/catalogue/upload"
            className="text-[16px] font-bold text-black hover:underline underline-offset-4"
          >
            Upload more designs
          </Link>
        </div>
      </div>
    </>
  );
}
