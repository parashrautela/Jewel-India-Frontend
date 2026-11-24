"use client";

import { useState, memo } from "react";
import Image from "next/image";

const TagChip = memo(function TagChip({ type, label }) {
  if (!label) return null;
  if (type === "material") {
    return (
      <span className="flex items-center gap-[4px] rounded-[6px] bg-[#fef3c7] pl-[4px] pr-[8px] py-[4px] text-[12px] leading-[16px] font-medium tracking-[0.24px] text-[#b45309] whitespace-nowrap">
        <img src="/retailer-admin/dot-gold.svg" alt="" width={12} height={12} />
        {label}
      </span>
    );
  }
  return (
    <span className="rounded-[6px] bg-[#ddebfc] px-[8px] py-[4px] text-[12px] leading-[16px] font-medium tracking-[0.24px] text-[#2555d0] whitespace-nowrap">
      {label}
    </span>
  );
});

/** iOS-style switch from the Figma (51×31). */
const ToggleSwitch = memo(function ToggleSwitch({ isOn, onToggle }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!isOn}
      aria-label="Archive"
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className={`relative w-[51px] h-[31px] rounded-[100px] shrink-0 transition-colors duration-200 ${isOn ? "bg-[#34c759]" : "bg-[rgba(120,120,128,0.16)]"}`}
    >
      <span
        className={`absolute top-[2px] left-[2px] w-[27px] h-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_3px_1px_rgba(0,0,0,0.06)] transition-transform duration-200 ${isOn ? "translate-x-[20px]" : ""}`}
      />
    </button>
  );
});

const DesignCard = memo(function DesignCard({ design, onArchiveToggle }) {
  const [imgError, setImgError] = useState(false);
  const title = design.title || "Untitled design";
  const tags = Array.isArray(design.tags) ? design.tags : [];

  // Extract a material and type from tags if available
  const material = tags.find(t => ["Gold", "Silver", "Platinum", "Diamond", "Rose Gold"].includes(t)) || "Gold";
  const type = tags.find(t => t !== material) || design.category || "Necklace";

  return (
    <article className="flex flex-col rounded-[24px] bg-white border border-[#e7e7e7] overflow-hidden p-[7px] pb-[14px] w-full max-w-[256px]">
      <div className="relative aspect-[240/241] w-full rounded-[16px] bg-gray-50 overflow-hidden">
        {!imgError && design.image_url ? (
          <Image
            src={design.image_url}
            alt={title}
            fill
            sizes="240px"
            loading="lazy"
            className="object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[12px] text-gray-400 bg-gray-100">
            No image available
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-2 px-[8px] pt-[10px]">
        <div className="flex flex-col gap-[12px] min-w-0">
          <h3 className="text-[14px] leading-[20px] font-bold tracking-[0.07px] text-black truncate">{title}</h3>
          <div className="flex items-center gap-[8px] overflow-hidden">
            <TagChip type="material" label={material} />
            <TagChip type="category" label={type} />
          </div>
        </div>
        <div className="flex flex-col items-end gap-[8px] shrink-0">
          <span className="text-[14px] font-semibold text-[#545454]">Archive</span>
          <ToggleSwitch isOn={design.is_archived} onToggle={() => onArchiveToggle(design)} />
        </div>
      </div>
    </article>
  );
});

export function RetailerCatalogueGrid({ designs, isLoading, onArchiveToggle }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[repeat(3,256px)] gap-x-[18px] gap-y-[28px]">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-[24px] bg-white border border-[#e7e7e7] overflow-hidden animate-pulse">
            <div className="aspect-square bg-gray-100" />
            <div className="p-5 space-y-3">
              <div className="flex justify-between">
                <div className="h-4 w-1/2 bg-gray-100 rounded" />
                <div className="h-4 w-12 bg-gray-100 rounded" />
              </div>
              <div className="flex justify-between items-center pt-1">
                <div className="flex gap-2">
                  <div className="h-6 w-16 bg-gray-100 rounded-[6px]" />
                  <div className="h-6 w-16 bg-gray-100 rounded-[6px]" />
                </div>
                <div className="h-6 w-11 bg-gray-100 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!designs.length) {
    return (
      <div className="rounded-[14px] border border-dashed border-gray-200 bg-white px-6 py-16 text-center shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
        <p className="text-[15px] font-bold text-[#111827]">No designs yet.</p>
        <p className="text-[13px] text-[#6B7280] mt-1.5">Upload your first design to build your sparkling catalogue.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[repeat(3,256px)] gap-x-[18px] gap-y-[28px]">
      {designs.map((design) => (
        <DesignCard
          key={design.id}
          design={design}
          onArchiveToggle={onArchiveToggle}
        />
      ))}
    </div>
  );
}
