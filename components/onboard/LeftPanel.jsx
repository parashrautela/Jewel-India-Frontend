export function LeftPanel({ heading, description, textMarginTop }) {
  return (
    <div className="flex flex-col items-center md:items-start gap-4 md:gap-[18px] w-full max-w-[320px]">
      <div className="flex items-center gap-3">
        <img src="/jewelLogo.svg" alt="Jewels India Logo" className="w-[clamp(28px,3vw,36px)] h-auto object-contain shrink-0" />
        <span className="text-[clamp(15px,1.6vw,18px)] font-extrabold text-[#111827] tracking-wide [.theme-retailer_&]:text-[16px] [.theme-retailer_&]:font-medium [.theme-retailer_&]:text-[#545454] [.theme-retailer_&]:tracking-normal">Jewels India</span>
      </div>

      <div className={`flex flex-col gap-1 ${textMarginTop || ''}`}>
        <h1 className="text-[clamp(16px,1.8vw,23px)] tracking-tight whitespace-nowrap leading-[1.2] font-extrabold text-[#111827] [.theme-retailer_&]:text-[32px] [.theme-retailer_&]:font-bold [.theme-retailer_&]:text-black [.theme-retailer_&]:tracking-normal">
          {heading}
        </h1>
        <p className="text-[clamp(13px,1.3vw,14px)] text-[#9CA3AF] leading-relaxed font-medium [.theme-retailer_&]:text-[16px] [.theme-retailer_&]:text-[#737373] [.theme-retailer_&]:font-semibold">
          {description}
        </p>
      </div>
    </div>
  );
}