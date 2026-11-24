"use client";

import { useEffect, useState } from "react";

export function StepIndicator({ currentStep = 1, totalSteps = 3 }) {
  // 1. Safe dynamic calculation based on total steps
  const getPercentageForStep = (step) => {
    if (step >= 4) return 100;
    return Math.max(0, ((step - 1) / totalSteps) * 100);
  };

  // 2. Safe sessionStorage access with SSR fallbacks
  const getInitialWidth = () => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("onboarding_last_step");
        if (saved) {
          const prevStep = parseInt(saved, 10);
          if (prevStep >= 1 && prevStep <= 4) {
            return getPercentageForStep(prevStep);
          }
        }
      } catch (e) {
        // Safe catch-all for storage access restrictions
      }
    }
    // Fallback: Default to immediate logical previous step
    return getPercentageForStep(currentStep - 1);
  };

  const targetPercentage = currentStep === 4 ? 100 : getPercentageForStep(currentStep);

  const [width, setWidth] = useState(getInitialWidth);
  const [isCompleted, setIsCompleted] = useState(false);
  const [popStep, setPopStep] = useState(false);

  useEffect(() => {
    // 3. Prevent initial width flash by updating width on the next animation frame
    const handle = requestAnimationFrame(() => {
      setWidth(targetPercentage);
    });

    // 4. Save current step for the next route transition
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("onboarding_last_step", currentStep.toString());
      } catch (e) {
        // Safe catch-all
      }
    }

    // 5. Subtle micro-interaction pops once progress transition ends (800ms)
    const microTimer = setTimeout(() => {
      setPopStep(true);
    }, 850);

    // 6. Completion glow effect on step 4 (Submitted) triggered exactly once
    let glowTimer;
    if (currentStep === 4) {
      glowTimer = setTimeout(() => {
        setIsCompleted(true);
      }, 800);
    }

    return () => {
      cancelAnimationFrame(handle);
      clearTimeout(microTimer);
      if (glowTimer) clearTimeout(glowTimer);
    };
  }, [currentStep, totalSteps, targetPercentage]);

  return (
    <div className="flex flex-col gap-3.5 w-full select-none">
      <div 
        className={`text-[13px] text-[#9CA3AF] font-semibold uppercase tracking-widest [.theme-retailer_&]:text-[20px] [.theme-retailer_&]:normal-case [.theme-retailer_&]:tracking-normal [.theme-retailer_&]:text-[#808080] transition-all duration-300 ${
          popStep ? "scale-[1.01] opacity-95 text-[#6B7280]" : "scale-100 opacity-80"
        }`}
        style={{
          transformOrigin: "left center",
          transition: "transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 400ms ease"
        }}
      >
        {currentStep <= totalSteps ? (
          <>
            <span className="font-extrabold text-[#111827] [.theme-retailer_&]:font-semibold [.theme-retailer_&]:text-[#808080]">Step <span className="[.theme-retailer_&]:text-black">{currentStep}</span></span> of {totalSteps}
          </>
        ) : (
          <span className="font-extrabold text-[#111827] tracking-wider">Verification Progress</span>
        )}
      </div>

      <div className="relative w-full h-[6px] bg-[#E5E7EB] rounded-full overflow-hidden [.theme-retailer_&]:h-[10px] [.theme-retailer_&]:bg-[#c3c3c3]">
        <div
          className={`h-full bg-[#111827] [.theme-retailer_&]:bg-black rounded-full progress-bar-transition ${
            isCompleted ? "shadow-[0_0_8px_rgba(17,24,39,0.25)]" : ""
          }`}
          style={{
            width: `${width}%`,
            transition: "width 800ms cubic-bezier(0.25, 1, 0.5, 1), box-shadow 400ms ease-out"
          }}
        />
      </div>
    </div>
  );
}