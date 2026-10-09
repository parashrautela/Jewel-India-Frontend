import UploadDesignCard from "./UploadDesignCard";

export default function HeroUploadSection({ businessName = "" }) {
  const displayName = businessName?.trim() || "Welcome";

  return (
    <section className="px-4 md:px-10 pt-6 pb-4">
      {/* Welcome Header */}
      <div className="mb-4">
        <p className="text-[#6B7280] text-xs md:text-sm font-sfpro mb-1">Welcome</p>
        <h1 className="text-[#1F2937] text-xl md:text-2xl font-medium font-sfpro">{displayName}</h1>
      </div>

      <UploadDesignCard />
    </section>
  );
}
