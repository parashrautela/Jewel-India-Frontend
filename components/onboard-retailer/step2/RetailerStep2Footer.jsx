"use client";
import { useRouter } from "next/navigation";

export function RetailerStep2Footer({ isFormValid, onSubmitAttempt }) {
  const router = useRouter();

  const handleNext = () => {
    if (isFormValid) {
      router.push("/onboard-retailer/step3");
    } else {
      onSubmitAttempt();
    }
  };
  return (
    <div className="w-full flex justify-end">
      <button
        type="button"
        onClick={handleNext}
        disabled={!isFormValid}
        className={`w-full md:w-[140px] font-extrabold rounded-[10px] px-4 py-[clamp(10px,1.2vw,14px)] text-[clamp(13px,1.4vw,15px)] transition-all tracking-wide transform translate-x-0 md:translate-x-[46px] ${
          isFormValid
            ? "bg-[#000000] text-white border border-[#e4cc8f] shadow-[0_4px_4px_rgba(0,0,0,0.25),inset_4px_4px_4px_rgba(228,204,143,0.39)] hover:opacity-90 cursor-pointer"
            : "bg-[#D1D5DB] text-white cursor-not-allowed"
        }`}
      >
        Next
      </button>
    </div>
  );
}
