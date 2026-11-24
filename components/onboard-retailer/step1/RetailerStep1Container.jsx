"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRetailerOnboard } from "../../../context/RetailerOnboardContext";
import { RetailerIdentityForm } from "./RetailerIdentityForm";
import { RetailerAadharUpload } from "./RetailerAadharUpload";

export function RetailerStep1Container() {
  const {
    name, setName,
    aadhar, setAadhar,
    frontImage, setFrontImage,
    backImage, setBackImage,
  } = useRetailerOnboard();

  const [submitAttempted, setSubmitAttempted] = useState(false);
  const router = useRouter();
  const isNameValid = name.trim().length > 0;
  const isAadharValid = aadhar.replace(/\s/g, "").length === 12;
  const isFormValid = isNameValid && isAadharValid && frontImage !== null && backImage !== null;

  const handleNext = () => {
    if (isFormValid) {
      router.push("/onboard-retailer/step2");
    } else {
      setSubmitAttempted(true);
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full mt-4">
      <RetailerIdentityForm
        name={name} setName={setName}
        aadhar={aadhar} setAadhar={setAadhar}
        submitAttempted={submitAttempted}
      />

      <div className="w-full flex flex-col gap-2">
        <RetailerAadharUpload
          frontImage={frontImage} setFrontImage={setFrontImage}
          backImage={backImage} setBackImage={setBackImage}
          submitAttempted={submitAttempted}
        />

        <div className="flex flex-col md:flex-row gap-[clamp(16px,2vw,32px)] w-full items-start">
          <div className="flex-1 min-w-0 w-full md:w-auto">
            <p className="text-[7px] md:text-[7px] text-black font-bold leading-relaxed pr-2">
              *Your documents are encrypted and only used for verification.<br />
              We never share them.
            </p>
          </div>
          <div className="flex-1 w-full md:w-auto min-w-0 flex justify-end mt-2 md:mt-0">
            <button
              type="button"
              onClick={handleNext}
              disabled={!isFormValid}
              className={`w-full md:w-[140px] font-extrabold rounded-[10px] px-4 py-[clamp(10px,1.2vw,14px)] text-[clamp(13px,1.4vw,15px)] transition-colors tracking-wide ${
                isFormValid
                  ? "bg-[#000000] text-white border border-[#e4cc8f] shadow-[0_4px_4px_rgba(0,0,0,0.25),inset_4px_4px_4px_rgba(228,204,143,0.39)] hover:opacity-90 cursor-pointer"
                  : "bg-[#D1D5DB] text-white cursor-not-allowed"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
