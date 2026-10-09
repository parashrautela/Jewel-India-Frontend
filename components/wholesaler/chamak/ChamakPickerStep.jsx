"use client";

import { useState, useMemo, useRef } from "react";
import Image from "next/image";
import { normalizeChainType } from "../../../lib/config/jewelleryTypes.mjs";
import { useCredits } from "../../../context/CreditsContext";

const CATEGORIES = [
  { id: "all", label: "All Items" },
  { id: "necklace", label: "Necklaces" },
  { id: "chain", label: "Chains" },
  { id: "rings", label: "Rings" },
  { id: "earrings", label: "Earrings" },
  { id: "haram", label: "Haram" },
  { id: "pendant", label: "Pendants" },
  { id: "bangles", label: "Bangles" },
  { id: "mangalsutra", label: "Mangalsutra" },
];

export default function ChamakPickerStep({
  selectedDesign1,
  selectedDesign2,
  catalogProducts = [],
  isLoadingProducts,
  onSelectProduct,
  onCustomImageChange,
  onStartAnalysis,
  canStartAnalysis,
  uploadError,
  errorMessage,
  onViewGallery,
  galleryCount = 0,
}) {
  const { wallet } = useCredits();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeUploadSlot, setActiveUploadSlot] = useState(null); // 1 or 2 when upload modal is open
  const [dragOverSlot, setDragOverSlot] = useState(null);

  const fileInputRef1 = useRef(null);
  const fileInputRef2 = useRef(null);
  const customTileInputRef = useRef(null);

  // Filter products by category and search term
  const filteredProducts = useMemo(() => {
    return catalogProducts.filter((product) => {
      const matchCat =
        selectedCategory === "all" ||
        (product.category && product.category.toLowerCase().includes(selectedCategory)) ||
        (product.jewellery_type && normalizeChainType(product.jewellery_type.toLowerCase()).includes(selectedCategory));

      const matchSearch =
        !searchQuery ||
        (product.title && product.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (product.jewellery_type && product.jewellery_type.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchCat && matchSearch;
    });
  }, [catalogProducts, selectedCategory, searchQuery]);

  // Helper to swap slot 1 and 2
  const handleSwapSlots = () => {
    const temp1 = selectedDesign1;
    const temp2 = selectedDesign2;

    if (temp1?.customFile) {
      onCustomImageChange(2, temp1.customFile);
    } else if (temp1?.product) {
      onSelectProduct(2, temp1.product);
    } else {
      onSelectProduct(2, null);
    }

    if (temp2?.customFile) {
      onCustomImageChange(1, temp2.customFile);
    } else if (temp2?.product) {
      onSelectProduct(1, temp2.product);
    } else {
      onSelectProduct(1, null);
    }
  };

  // Smart click to assign: if slot 1 is empty, assign to 1; if slot 1 filled but 2 empty, assign to 2; else replace 1
  const handleProductCardClick = (product) => {
    if (selectedDesign1?.product?.id === product.id) {
      onSelectProduct(1, null);
      return;
    }
    if (selectedDesign2?.product?.id === product.id) {
      onSelectProduct(2, null);
      return;
    }

    if (!selectedDesign1) {
      onSelectProduct(1, product);
    } else if (!selectedDesign2) {
      onSelectProduct(2, product);
    } else {
      // Both filled, toggle slot 1 by default or replace
      onSelectProduct(1, product);
    }
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8 w-full max-w-7xl mx-auto py-2">
      {/* ── TOP HEADER ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">✨</span>
            <h1 className="text-2xl md:text-3xl font-bold font-cirka text-celestique-dark">
              Chamak AI Jewelry Fusion Studio
            </h1>
          </div>
          <p className="text-xs md:text-sm text-celestique-muted font-sans">
            Pick two designs from your collection below or upload external photos to synthesize an AI composite.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Gallery Button */}
          <button
            type="button"
            onClick={onViewGallery}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-celestique-cream text-celestique-dark border border-celestique-taupe transition-all text-xs font-semibold tracking-wide shadow-2xs"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            Past Fusions {galleryCount > 0 && `(${galleryCount})`}
          </button>
        </div>
      </div>

      {/* ── FUSION STAGE WORKBENCH (PINNED TOP POD) ───────────────────────────── */}
      <div className="relative w-full bg-gradient-to-b from-[#FAF8F5] to-[#F3EFE6] border-2 border-celestique-taupe rounded-3xl p-5 md:p-8 shadow-sm">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-1/4 w-72 h-32 bg-[#D4AF37]/10 blur-3xl pointer-events-none rounded-full" />
        <div className="absolute bottom-0 left-1/4 w-72 h-32 bg-[#3B82F6]/10 blur-3xl pointer-events-none rounded-full" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Slot 1: Foundation (Gold) */}
          <div className="w-full lg:flex-1">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#D4AF37] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  1
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-[#997A15]">
                  Design 1 (Foundation)
                </span>
              </div>
              {selectedDesign1 && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectProduct(1, null);
                    onCustomImageChange(1, null);
                  }}
                  className="text-[11px] font-semibold text-red-600 hover:text-red-800 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Slot 1 Pod Box */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverSlot(1);
              }}
              onDragLeave={() => setDragOverSlot(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverSlot(null);
                if (e.dataTransfer.files?.[0]) onCustomImageChange(1, e.dataTransfer.files[0]);
              }}
              onClick={() => {
                if (!selectedDesign1) fileInputRef1.current?.click();
              }}
              className={`relative h-44 sm:h-48 w-full rounded-2xl border-2 transition-all overflow-hidden flex items-center justify-between p-3.5 bg-white ${
                selectedDesign1
                  ? "border-[#D4AF37] shadow-md"
                  : dragOverSlot === 1
                  ? "border-[#D4AF37] bg-[#FEF9E7]/60"
                  : "border-dashed border-celestique-taupe hover:border-[#D4AF37]/80 hover:bg-[#FEF9E7]/20 cursor-pointer"
              }`}
            >
              {selectedDesign1 ? (
                <div className="flex items-center gap-4 w-full h-full">
                  <div className="relative h-full aspect-square rounded-xl bg-celestique-cream/40 p-2 overflow-hidden border border-[#D4AF37]/40 shrink-0">
                    <img
                      src={selectedDesign1.imageUrl}
                      alt={selectedDesign1.label}
                      className="w-full h-full object-contain mix-blend-multiply"
                    />
                  </div>
                  <div className="flex flex-col justify-center flex-1 min-w-0 pr-2">
                    <span className="text-xs font-bold text-celestique-dark truncate">
                      {selectedDesign1.label}
                    </span>
                    <span className="text-[11px] text-celestique-muted mt-0.5">
                      {selectedDesign1.customFile ? "Custom Upload" : "From Catalogue"}
                    </span>
                    <span className="text-[10px] text-[#997A15] font-semibold mt-2 bg-[#FEF9E7] border border-[#E9DFBE] px-2 py-0.5 rounded-md self-start">
                      Provides Silhouette & Proportions
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center w-full gap-2 py-4">
                  <div className="w-10 h-10 rounded-full bg-[#FEF9E7] border border-[#E9DFBE] flex items-center justify-center text-[#997A15] shadow-2xs">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-celestique-dark">
                      Select or Upload Design 1
                    </span>
                    <span className="text-[11px] text-celestique-muted">
                      Click a product below, or click here to upload
                    </span>
                  </div>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef1}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) onCustomImageChange(1, e.target.files[0]);
              }}
            />
          </div>

          {/* Center Bridge & Swap Button */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <button
              type="button"
              onClick={handleSwapSlots}
              disabled={!selectedDesign1 && !selectedDesign2}
              title="Swap Slot 1 and Slot 2"
              className="group relative w-12 h-12 rounded-full bg-white border-2 border-celestique-dark/20 hover:border-celestique-dark hover:scale-110 active:scale-95 transition-all shadow-md flex items-center justify-center disabled:opacity-40 disabled:hover:scale-100 cursor-pointer"
            >
              <span className="text-base group-hover:rotate-180 transition-transform duration-300">
                ⇄
              </span>
              <span className="sr-only">Swap designs</span>
            </button>
            <span className="text-[10px] font-bold uppercase tracking-widest text-celestique-muted mt-1.5 font-sans">
              AI Fusion
            </span>
          </div>

          {/* Slot 2: Upgrade (Blue) */}
          <div className="w-full lg:flex-1">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#3B82F6] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  2
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                  Design 2 (Upgrade)
                </span>
              </div>
              {selectedDesign2 && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectProduct(2, null);
                    onCustomImageChange(2, null);
                  }}
                  className="text-[11px] font-semibold text-red-600 hover:text-red-800 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Slot 2 Pod Box */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverSlot(2);
              }}
              onDragLeave={() => setDragOverSlot(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverSlot(null);
                if (e.dataTransfer.files?.[0]) onCustomImageChange(2, e.dataTransfer.files[0]);
              }}
              onClick={() => {
                if (!selectedDesign2) fileInputRef2.current?.click();
              }}
              className={`relative h-44 sm:h-48 w-full rounded-2xl border-2 transition-all overflow-hidden flex items-center justify-between p-3.5 bg-white ${
                selectedDesign2
                  ? "border-[#3B82F6] shadow-md"
                  : dragOverSlot === 2
                  ? "border-[#3B82F6] bg-[#EFF6FF]/60"
                  : "border-dashed border-celestique-taupe hover:border-[#3B82F6]/80 hover:bg-[#EFF6FF]/20 cursor-pointer"
              }`}
            >
              {selectedDesign2 ? (
                <div className="flex items-center gap-4 w-full h-full">
                  <div className="relative h-full aspect-square rounded-xl bg-celestique-cream/40 p-2 overflow-hidden border border-[#3B82F6]/40 shrink-0">
                    <img
                      src={selectedDesign2.imageUrl}
                      alt={selectedDesign2.label}
                      className="w-full h-full object-contain mix-blend-multiply"
                    />
                  </div>
                  <div className="flex flex-col justify-center flex-1 min-w-0 pr-2">
                    <span className="text-xs font-bold text-celestique-dark truncate">
                      {selectedDesign2.label}
                    </span>
                    <span className="text-[11px] text-celestique-muted mt-0.5">
                      {selectedDesign2.customFile ? "Custom Upload" : "From Catalogue"}
                    </span>
                    <span className="text-[10px] text-[#2563EB] font-semibold mt-2 bg-[#EFF6FF] border border-[#BFDBFE] px-2 py-0.5 rounded-md self-start">
                      Injects Stone Settings & Motifs
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center w-full gap-2 py-4">
                  <div className="w-10 h-10 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#2563EB] shadow-2xs">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-celestique-dark">
                      Select or Upload Design 2
                    </span>
                    <span className="text-[11px] text-celestique-muted">
                      Click a product below, or click here to upload
                    </span>
                  </div>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef2}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) onCustomImageChange(2, e.target.files[0]);
              }}
            />
          </div>
        </div>

        {/* Action Trigger Bar inside Stage */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-5 border-t border-celestique-taupe/80">
          <div className="flex items-center gap-2 text-xs text-celestique-muted">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF9E7] text-[#997A15] font-bold border border-[#E9DFBE]">
              🪙 Treasure Chest: {wallet?.available ?? 0} credits
            </span>
            <span className="hidden md:inline">• Stage 1: Vision Analysis</span>
          </div>

          <button
            type="button"
            disabled={!canStartAnalysis}
            onClick={onStartAnalysis}
            className={`w-full sm:w-auto px-10 py-3.5 rounded-full font-bold text-xs md:text-sm tracking-wider uppercase transition-all shadow-md flex items-center justify-center gap-2.5 ${
              canStartAnalysis
                ? "bg-celestique-dark text-white hover:bg-black hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                : "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"
            }`}
          >
            <span>Begin Vision Analysis</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Error Alert Display (Fix #1) */}
      {(uploadError || errorMessage) && (
        <div className="border border-red-200 bg-red-50 p-4 rounded-2xl flex items-start gap-3 animate-fade-in shadow-xs">
          <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
            !
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-red-900">Selection Error</h4>
            <p className="text-xs text-red-700 mt-0.5">{uploadError || errorMessage}</p>
          </div>
        </div>
      )}

      {/* ── BOTTOM SECTION: FULL CATALOGUE STUDIO GALLERY ─────────────────────── */}
      <div className="flex flex-col gap-5 pt-2">
        {/* Controls: Search & Category Pills */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2">
          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? "bg-celestique-dark text-white shadow-xs"
                    : "bg-white border border-celestique-taupe text-celestique-muted hover:border-celestique-dark hover:text-celestique-dark"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search designs..."
              className="w-full text-xs bg-white border border-celestique-taupe rounded-full py-2 pl-8 pr-3 text-celestique-dark focus:outline-none focus:border-celestique-dark transition-all"
            />
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        </div>

        {/* Gallery Grid */}
        {isLoadingProducts ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 py-8">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="aspect-[4/5] rounded-2xl bg-celestique-taupe/30 animate-pulse border border-celestique-taupe/40"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {/* Tile 0: Upload Custom Piece Card */}
            <div
              onClick={() => customTileInputRef.current?.click()}
              className="group relative aspect-[4/5] rounded-2xl border-2 border-dashed border-celestique-taupe hover:border-celestique-dark bg-white hover:bg-celestique-cream/30 transition-all p-4 flex flex-col items-center justify-center text-center cursor-pointer shadow-2xs hover:shadow-sm"
            >
              <div className="w-12 h-12 rounded-full bg-celestique-cream group-hover:scale-110 transition-transform flex items-center justify-center text-celestique-dark mb-3">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <h4 className="text-xs font-bold text-celestique-dark">Upload Custom File</h4>
              <p className="text-[10px] text-celestique-muted mt-1 leading-snug">
                Drop any image or sketch from your device
              </p>
              <input
                ref={customTileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    // Assign to next open slot
                    if (!selectedDesign1) onCustomImageChange(1, e.target.files[0]);
                    else onCustomImageChange(2, e.target.files[0]);
                  }
                }}
              />
            </div>

            {/* Product Cards */}
            {filteredProducts.map((product) => {
              const isSelectedSlot1 = selectedDesign1?.product?.id === product.id;
              const isSelectedSlot2 = selectedDesign2?.product?.id === product.id;
              const isSelected = isSelectedSlot1 || isSelectedSlot2;

              const imgUrl =
                product.processed_image_url ||
                product.generated_image_urls?.[0] ||
                product.raw_image_url ||
                "";

              const title =
                product.title ||
                (product.jewellery_type
                  ? product.jewellery_type.charAt(0).toUpperCase() + product.jewellery_type.slice(1)
                  : "Jewellery Piece");

              return (
                <div
                  key={product.id}
                  onClick={() => handleProductCardClick(product)}
                  className={`group relative flex flex-col bg-white rounded-2xl border transition-all duration-200 overflow-hidden cursor-pointer shadow-2xs hover:shadow-md ${
                    isSelectedSlot1
                      ? "ring-3 ring-[#D4AF37] border-[#D4AF37]"
                      : isSelectedSlot2
                      ? "ring-3 ring-[#3B82F6] border-[#3B82F6]"
                      : "border-celestique-taupe hover:border-celestique-dark"
                  }`}
                >
                  {/* Active Selection Badge */}
                  {isSelectedSlot1 && (
                    <div className="absolute top-2.5 left-2.5 z-20 px-2.5 py-0.5 rounded-full bg-[#D4AF37] text-white text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1">
                      <span>✓</span> Slot 1
                    </div>
                  )}
                  {isSelectedSlot2 && (
                    <div className="absolute top-2.5 left-2.5 z-20 px-2.5 py-0.5 rounded-full bg-[#3B82F6] text-white text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1">
                      <span>✓</span> Slot 2
                    </div>
                  )}

                  {/* Image Frame */}
                  <div className="relative aspect-square w-full bg-gradient-to-b from-[#F8F6F0] to-[#EFEBE1] p-3 flex items-center justify-center overflow-hidden">
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={title}
                        className="w-full h-full object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="text-[10px] text-celestique-muted">No Image</div>
                    )}

                    {/* Hover Assign Buttons Overlay */}
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-2xs opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3 z-10">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectProduct(1, product);
                        }}
                        className={`w-full py-2 px-3 rounded-lg text-[11px] font-bold transition-transform active:scale-95 ${
                          isSelectedSlot1
                            ? "bg-[#D4AF37] text-white"
                            : "bg-white text-[#997A15] hover:bg-[#FEF9E7]"
                        }`}
                      >
                        {isSelectedSlot1 ? "✓ Selected as Slot 1" : "+ Set as Design 1"}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectProduct(2, product);
                        }}
                        className={`w-full py-2 px-3 rounded-lg text-[11px] font-bold transition-transform active:scale-95 ${
                          isSelectedSlot2
                            ? "bg-[#3B82F6] text-white"
                            : "bg-white text-[#2563EB] hover:bg-[#EFF6FF]"
                        }`}
                      >
                        {isSelectedSlot2 ? "✓ Selected as Slot 2" : "+ Set as Design 2"}
                      </button>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="p-3 flex flex-col gap-0.5 border-t border-celestique-taupe/40 bg-white">
                    <h4 className="text-xs font-bold text-celestique-dark truncate">
                      {title}
                    </h4>
                    <span className="text-[10px] text-celestique-muted truncate">
                      {product.jewellery_type || product.category || "Jewellery"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
