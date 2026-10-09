"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useEmployeeAppearance } from "@/context/EmployeeAppearanceContext";

const QUESTIONS = [
  {
    id: "occasion",
    title: "What's the occasion?",
    type: "single",
    options: ["Wedding", "Engagement", "Festival", "Gift", "Daily Wear", "Party"]
  },
  {
    id: "material",
    title: "Select material",
    type: "multiple",
    options: ["Gold", "Silver", "Platinum", "Diamond", "Artificial"]
  },
  {
    id: "style",
    title: "What are you drawn to?",
    type: "single",
    options: ["Traditional", "Modern", "Minimalist", "Statement", "Fusion"]
  },
  {
    id: "type",
    title: "Jewel type",
    type: "multiple",
    options: ["Necklaces", "Rings", "Bangles", "Earrings", "Pendants", "View All"]
  },
  {
    id: "weight",
    title: "What weight?",
    type: "multiple",
    options: ["Light (0-5g)", "Medium (5-15g)", "Heavy (15-30g)", "Statement (30g+)"]
  }
];

export default function QuestionnaireFlow({ businessName }) {
  const router = useRouter();
  const { sarvamMode } = useEmployeeAppearance();
  const [currentStep, setCurrentStep] = useState(0);
  
  // Store answers as an object: { questionId: [selectedOptions] }
  const [answers, setAnswers] = useState({
    occasion: [],
    material: [],
    style: [],
    type: [],
    weight: []
  });

  const currentQ = QUESTIONS[currentStep];

  const handleToggleOption = (option) => {
    setAnswers(prev => {
      const currentSelections = prev[currentQ.id];
      
      if (currentQ.type === "single") {
        return { ...prev, [currentQ.id]: [option] };
      }
      
      // Handle Multiple Choice
      // Special case for 'View All' in jewel type
      if (currentQ.id === "type" && option === "View All") {
        return { ...prev, [currentQ.id]: ["View All"] };
      }
      
      let newSelections;
      if (currentSelections.includes(option)) {
        newSelections = currentSelections.filter(item => item !== option);
      } else {
        newSelections = [...currentSelections.filter(item => item !== "View All"), option];
      }
      return { ...prev, [currentQ.id]: newSelections };
    });
  };

  const handleNext = () => {
    // Validate selection
    if (answers[currentQ.id].length === 0) {
      alert("Please select at least one option.");
      return;
    }

    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Final Submit
      const params = new URLSearchParams();
      Object.entries(answers).forEach(([key, values]) => {
        if (values.length > 0) {
          params.append(key, values.join(","));
        }
      });
      router.push(`/dashboard/employee/playground?${params.toString()}`);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      router.push('/dashboard/employee');
    }
  };

  return (
    <div data-employee-page="questionnaire" className="w-full flex flex-col bg-white">
      {/* ── Hero Section — Full Viewport Height ── */}
      <section
        className="relative w-full flex flex-col items-center justify-start overflow-hidden"
        style={{ minHeight: "100dvh" }}
      >
        {/* Background Image (Archway) */}
        <div 
          data-employee-ornament
          className="absolute inset-0 z-0"
          style={{ 
            backgroundImage: "url('https://res.cloudinary.com/dcs0vuzwg/image/upload/v1778318369/home_bg_ryyopk.svg')",
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center"
          }}
        />

        {/* ── Top Bar Overlay (Back Button) ── */}
        <div className="absolute top-0 left-0 w-full px-6 py-6 flex justify-between items-center z-50">
          <button 
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center text-gray-700 hover:bg-white transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div data-employee-question-content className="relative z-10 flex flex-col items-center text-center px-4 pt-48 pb-28">
          <h1 className="font-serif text-[42px] md:text-[54px] text-[#2c1f18] mb-3 leading-tight">
            {businessName}
          </h1>
          <p className="text-[13px] md:text-[15px] text-[#4a3b32] max-w-[320px] md:max-w-md mx-auto mb-8 leading-relaxed">
            Discover designs selected with precision, blending craftsmanship and ethnic style
          </p>

          {/* Interactive Card */}
          <div data-employee-question-card className="w-[85vw] max-w-[280px] md:max-w-[320px] lg:max-w-[380px] xl:max-w-[440px] rounded-[24px] overflow-hidden relative shadow-2xl flex flex-col" style={{ aspectRatio: "1/1" }}>
            {/* Full card background image */}
            <div data-employee-ornament className="absolute inset-0">
              <img
                src="https://res.cloudinary.com/dcs0vuzwg/image/upload/v1778318370/home_fg_gtjkeu.svg"
                alt="Card Background"
                className="w-full h-full object-cover"
              />
            </div>

            {/* No overlays as requested */}

            {/* Content — full height flex */}
            <div className="relative z-10 flex flex-col h-full p-6 pb-5">
              <h3
                className="font-serif text-white leading-[1.1] text-left mb-12 whitespace-nowrap"
                style={{ fontSize: "clamp(18px, 5vw, 23px)", fontWeight: 400 }}
              >
                {currentQ.title}
              </h3>
              
              {/* Options Grid */}
              <div data-employee-question-options className="grid grid-cols-2 gap-x-12 gap-y-4 mb-2 flex-1 content-start overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
                {currentQ.options.map(option => {
                  const isSelected = answers[currentQ.id].includes(option);
                  return (
                    <label 
                      key={option} 
                      className="flex items-center justify-between gap-4 w-full cursor-pointer group"
                    >
                      <span 
                        data-employee-question-option
                        className="text-white/90 group-hover:text-white transition-colors select-none text-left leading-tight"
                        style={{ fontSize: "clamp(15px, 3.5vw, 19px)" }}
                      >
                        {option}
                      </span>

                      {/* Custom Checkbox Visual */}
                      <div data-employee-question-check-art className="relative w-[26px] h-[26px] flex-shrink-0">
                        {/* Base Empty Checkbox Layer */}
                        <img 
                          src="https://res.cloudinary.com/dcs0vuzwg/image/upload/v1778318365/tick_bg_wdfml1.svg"
                          alt="Checkbox"
                          className="absolute inset-0 w-full h-full object-contain"
                        />
                        {/* Tick Overlay Layer with Pop Animation */}
                        <img 
                          src="https://res.cloudinary.com/dcs0vuzwg/image/upload/v1778318366/tick_n4epln.svg"
                          alt="Tick"
                          className={`absolute inset-0 w-full h-full object-contain transition-all duration-200 ${
                            isSelected ? "opacity-100 scale-100" : "opacity-0 scale-50"
                          }`}
                        />
                      </div>
                      
                      {/* Hidden actual input */}
                      <input 
                        data-employee-question-checkbox
                        type={currentQ.type === "single" ? "radio" : "checkbox"} 
                        className={sarvamMode ? "w-5 h-5 shrink-0" : "hidden"}
                        name={currentQ.id}
                        checked={isSelected}
                        onChange={() => handleToggleOption(option)}
                      />
                    </label>
                  );
                })}
              </div>
              
              {/* Action Button */}
              <div className="mt-auto">
                <button 
                  onClick={handleNext}
                  className="w-full py-3 rounded-none bg-[#1a1a1a]/90 backdrop-blur-sm text-white text-[15px] font-medium tracking-wide border border-white/10 hover:bg-[#111] transition-all"
                >
                  {currentStep === QUESTIONS.length - 1 ? 'Finish' : 'Next'}
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
