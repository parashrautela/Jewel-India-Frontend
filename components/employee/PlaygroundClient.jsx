"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const InfinityCanvas = dynamic(() => import("./InfinityCanvas"), {
  ssr: false,
  loading: () => <div data-employee-fullscreen className="fixed inset-0 flex items-center justify-center bg-[#FAFAFA] text-gray-500 font-medium">Loading layout...</div>,
});

const PlaygroundCatalogueGrid = dynamic(() => import("./PlaygroundCatalogueGrid"), {
  loading: () => <div data-employee-fullscreen className="fixed inset-0 flex items-center justify-center bg-[#FAFAFA] text-gray-500 font-medium">Loading layout...</div>,
});

export default function PlaygroundClient({ products, employeeId, retailerName }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams ? searchParams.get("mode") : null;
  
  // Shared state between InfinityCanvas and PlaygroundCatalogueGrid
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [viewMode, setViewMode] = useState(initialMode || "playground");

  useEffect(() => {
    router.prefetch("/dashboard/employee");
    router.prefetch("/dashboard/employee/playground/review");
    router.prefetch("/dashboard/employee/questionnaire");
  }, [router]);

  const handleNext = () => {
    // Save to session storage and proceed
    sessionStorage.setItem('employee_selected_products', JSON.stringify(Array.from(selectedItems)));
    router.push('/dashboard/employee/playground/review');
  };

  const handleBack = () => {
    // Go back to dashboard home
    router.push('/dashboard/employee');
  };

  if (products.length === 0) {
    return (
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6 pb-32">
        <div className="rounded-[16px] border border-dashed border-gray-200 bg-gray-50 px-6 py-16 text-center mt-4">
          <p className="text-[14px] font-semibold text-gray-500">No matches found.</p>
          <p className="text-[12px] text-gray-400 mt-2">
            Try adjusting your questionnaire answers to see more products.
          </p>
          <button 
            onClick={() => router.push('/dashboard/employee/questionnaire')}
            className="mt-6 px-6 py-2 bg-black text-white text-[13px] font-bold rounded-lg shadow hover:bg-gray-800 transition-colors"
          >
            Retake Questionnaire
          </button>
        </div>
      </div>
    );
  }

  if (viewMode === null) {
    return (
      <div className="w-full flex flex-col bg-white">
        {/* ── Hero Section — Full Viewport Height ── */}
        <section
          className="relative w-full flex flex-col items-center justify-start overflow-hidden"
          style={{ minHeight: "100dvh" }}
        >
          {/* Background Image (Archway) */}
          <div 
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
          <div className="relative z-10 flex flex-col items-center text-center px-4 pt-48 pb-28">
            <h1 className="font-serif text-[42px] md:text-[54px] text-[#2c1f18] mb-3 leading-tight">
              {retailerName}
            </h1>
            <p className="text-[13px] md:text-[15px] text-[#4a3b32] max-w-[320px] md:max-w-md mx-auto mb-8 leading-relaxed">
              Discover designs selected with precision, blending craftsmanship and ethnic style
            </p>

            {/* Interactive Card */}
            <div className="w-[85vw] max-w-[280px] md:max-w-[320px] lg:max-w-[380px] xl:max-w-[440px] rounded-[24px] overflow-hidden relative shadow-2xl flex flex-col" style={{ aspectRatio: "1/1" }}>
              {/* Full card background image */}
              <div className="absolute inset-0">
                <img
                  src="https://res.cloudinary.com/dcs0vuzwg/image/upload/v1778318370/home_fg_gtjkeu.svg"
                  alt="Card Background"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Content — full height flex */}
              <div className="relative z-10 flex flex-col h-full p-8 pb-8 justify-between">
                {/* Top: title */}
                <h3
                  className="font-serif text-white leading-[1.2] text-left uppercase tracking-wider"
                  style={{ fontSize: "clamp(20px, 5vw, 26px)", fontWeight: 400 }}
                >
                  select view mode
                </h3>

                {/* Bottom: two CTAs with clear visual hierarchy */}
                <div className="flex flex-col gap-2.5 w-full">
                  <button
                    onClick={() => setViewMode("catalogue")}
                    className="w-full py-3.5 bg-white text-black text-[13px] font-bold tracking-widest uppercase hover:bg-gray-100 hover:scale-[1.02] transition-all duration-300 shadow-md border-none outline-none cursor-pointer"
                  >
                    Catalog
                  </button>
                  <button
                    onClick={() => setViewMode("playground")}
                    className="w-full py-3 bg-transparent text-white text-[12px] font-semibold tracking-widest uppercase border border-white/40 hover:bg-white/10 hover:border-white/70 hover:scale-[1.01] transition-all duration-300 outline-none cursor-pointer"
                  >
                    Infinite Canvas
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <Suspense fallback={<div data-employee-fullscreen className="fixed inset-0 flex items-center justify-center bg-[#FAFAFA] text-gray-500 font-medium">Loading layout...</div>}>
      {viewMode === "playground" ? (
        <InfinityCanvas 
          products={products}
          selectedItems={selectedItems}
          setSelectedItems={setSelectedItems}
          onNext={handleNext}
          onBack={handleBack}
          retailerName={retailerName}
          onToggleLayout={setViewMode}
        />
      ) : (
        <PlaygroundCatalogueGrid 
          products={products}
          selectedItems={selectedItems}
          setSelectedItems={setSelectedItems}
          onNext={handleNext}
          onBack={handleBack}
          retailerName={retailerName}
          onToggleLayout={setViewMode}
        />
      )}
    </Suspense>
  );
}
