"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import { useEmployeeAppearance } from "@/context/EmployeeAppearanceContext";
import DesignerCollectionSection from "./DesignerCollectionSection";

export default function EmployeeHomeClient({ employee, businessName, businessLogoUrl, designs }) {
  const router = useRouter();
  const { theme } = useTheme();
  const { sarvamMode } = useEmployeeAppearance();

  useEffect(() => {
    router.prefetch("/dashboard/employee/wholesaler-gallery");
    router.prefetch("/dashboard/employee/playground");
  }, [router]);

  const isMaharaja = theme === "maharaja";
  const bgImage = isMaharaja
    ? "https://res.cloudinary.com/dcs0vuzwg/image/upload/v1781085325/Maharaja_Theme_ymaqjt.svg"
    : "https://res.cloudinary.com/dcs0vuzwg/image/upload/v1778318369/home_bg_ryyopk.svg";

  if (sarvamMode) {
    return (
      <div className="w-full flex flex-col employee-sarvam-home">
        <section className="employee-sarvam-hero">
          <img
            src={businessLogoUrl || "https://res.cloudinary.com/dcs0vuzwg/image/upload/v1777013959/jewel_logo_rhgin9.svg"}
            alt={`${businessName} Logo`}
            className="employee-sarvam-logo"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = "https://res.cloudinary.com/dcs0vuzwg/image/upload/v1777013959/jewel_logo_rhgin9.svg";
            }}
          />
          <p className="employee-sarvam-eyebrow">Your store. Your collection.</p>
          <h1 className="employee-sarvam-title">{businessName}</h1>
          <p className="employee-sarvam-description">
            Discover designs selected with precision, blending craftsmanship and ethnic style
          </p>
          <div className="employee-sarvam-hero-actions">
            <button type="button" data-sarvam-action="primary" onClick={() => router.push("/dashboard/employee/wholesaler-gallery")}>
              Catalogue
            </button>
            <button type="button" data-sarvam-action="secondary" onClick={() => router.push("/dashboard/employee/playground")}>
              Infinite Canvas
            </button>
          </div>
          <p className="employee-sarvam-hero-footnote">Jewellery, thoughtfully selected</p>
        </section>
        <DesignerCollectionSection employee={employee} businessName={businessName} designs={designs} />
      </div>
    );
  }

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
            backgroundImage: `url('${bgImage}')`,
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center"
          }}
        />

        {/* Content */}
        <div 
          className="relative z-10 flex flex-col items-center text-center px-4 animate-fade-in"
          style={{ paddingTop: "clamp(100px, 15vh, 220px)" }}
        >
          {/* Business Logo above Business Name */}
          <div className="w-[80px] h-[80px] md:w-[96px] md:h-[96px] rounded-full overflow-hidden bg-white shadow-md border border-gray-100 mb-4 flex items-center justify-center shrink-0">
            <img
              src={businessLogoUrl || "https://res.cloudinary.com/dcs0vuzwg/image/upload/v1777013959/jewel_logo_rhgin9.svg"}
              alt={`${businessName} Logo`}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = "https://res.cloudinary.com/dcs0vuzwg/image/upload/v1777013959/jewel_logo_rhgin9.svg";
              }}
            />
          </div>

          <h1 className="font-serif text-[42px] md:text-[54px] text-[#2c1f18] mb-2 leading-tight">
            {businessName}
          </h1>
          <p className="text-[13px] md:text-[15px] text-[#4a3b32] max-w-[320px] md:max-w-md mx-auto mb-6 leading-relaxed">
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

            {/* No overlays as requested */}

            {/* Content — full height flex */}
            <div className="relative z-10 flex flex-col h-full p-8 pb-8 justify-between">
              {/* Top: Select View Mode title */}
              <h3
                className="font-serif text-white leading-[1.2] text-left uppercase tracking-wider"
                style={{ fontSize: "clamp(20px, 5vw, 26px)", fontWeight: 400 }}
              >
                select view mode
              </h3>

              {/* Bottom: two CTAs with clear visual hierarchy */}
              <div className="flex flex-col gap-2.5 w-full">
                <button
                  onClick={() => router.push('/dashboard/employee/wholesaler-gallery')}
                  className="w-full py-3.5 bg-white text-black text-[13px] font-bold tracking-widest uppercase hover:bg-gray-100 hover:scale-[1.02] transition-all duration-300 shadow-md border-none outline-none cursor-pointer"
                >
                  Catalog
                </button>
                <button
                  onClick={() => router.push('/dashboard/employee/playground')}
                  className="w-full py-3 bg-transparent text-white text-[12px] font-semibold tracking-widest uppercase border border-white/40 hover:bg-white/10 hover:border-white/70 hover:scale-[1.01] transition-all duration-300 outline-none cursor-pointer"
                >
                  Infinite Canvas
                </button>
              </div>
            </div>
          </div>
        </div>


      </section>

      {/* ── Designer Collection Section ── */}
      <DesignerCollectionSection employee={employee} businessName={businessName} designs={designs} />
    </div>
  );
}
