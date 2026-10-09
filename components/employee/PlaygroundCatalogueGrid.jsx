"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useRef, memo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ProtectedImage from "../shared/ProtectedImage";
import useLongPress from "@/lib/hooks/useLongPress";

const ProductInfoModal = dynamic(
  () => import("./ProductInfoModal").then((mod) => mod.ProductInfoModal),
  { loading: () => null }
);

const TagChip = memo(function TagChip({ type, label }) {
  if (!label) return null;
  
  if (type === "material") {
    return (
      <span className="flex items-center gap-1.5 rounded-[6px] bg-[#FEF3C7] px-2.5 py-1 text-[12px] font-medium text-[#B45309]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] shrink-0"></span>
        {label}
      </span>
    );
  }
  return (
    <span className="rounded-[6px] bg-[#E0E7FF] px-2.5 py-1 text-[12px] font-medium text-[#4338CA] truncate max-w-[100px]">
      {label}
    </span>
  );
});

const DesignCard = memo(function DesignCard({ product, isSelected, onToggleSelect }) {
  const [imgError, setImgError] = useState(false);
  const router = useRouter();
  const title = product.title || product.jewellery_type || "Jewellery Item";
  
  // Extract purity/metal_type and category
  const purity = product.purity || product.metal_purity;
  const metalType = product.metal_type || "Gold";
  const material = purity ? `${purity} ${metalType}` : metalType;
  const type = product.category || product.jewellery_type || product.type || "Jewellery";

  const imgUrl = product.generated_image_urls?.[0] || product.processed_image_url || product.raw_image_url;

  const longPressProps = useLongPress({
    onLongPress: () => onToggleSelect(product),
    onClick: () => router.push(`/dashboard/employee/playground/review?productId=${product.id}`),
    delay: 500,
  });

  return (
    <div 
      {...longPressProps}
      className={`cursor-pointer rounded-[14px] bg-white overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:scale-[1.01] transition-all duration-300 flex flex-col border-[2px] ${
        isSelected ? "border-[#007AFF] ring-1 ring-[#007AFF]" : "border-transparent"
      } ${longPressProps.isPressing ? "scale-95 opacity-80" : ""}`}
    >
      <div className="relative aspect-square w-full bg-gray-50 overflow-hidden group">
        {!imgError && imgUrl ? (
          <ProtectedImage
            src={imgUrl}
            alt={title}
            className="h-full w-full object-cover mix-blend-multiply"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[12px] text-gray-400 bg-gray-100">
            No image available
          </div>
        )}

        {/* Selection toggle overlay button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(product);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className={`absolute top-3 left-3 rounded-full w-7 h-7 flex items-center justify-center shadow-md z-[2] transition-all hover:scale-110 ${
            isSelected 
              ? "bg-[#007AFF] text-white border-none" 
              : "bg-white/80 backdrop-blur-sm border border-gray-200 text-transparent hover:text-gray-400"
          }`}
          title={isSelected ? "Deselect Item" : "Select Item"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col p-5 bg-white flex-1 justify-between">
        <h3 className="text-[14px] font-bold text-[#111827] truncate pr-2 mb-3">
          {title}
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden pr-2">
            <TagChip type="material" label={material} />
            <TagChip type="category" label={type} />
          </div>
        </div>
      </div>
    </div>
  );
});

export default function PlaygroundCatalogueGrid({
  products,
  selectedItems,
  setSelectedItems,
  onNext,
  onBack,
  retailerName,
  onToggleLayout,
}) {
  const [viewingProductForModal, setViewingProductForModal] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const searchParams = useSearchParams();

  const toggleSelection = (product) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(product.id)) {
        next.delete(product.id);
      } else {
        next.add(product.id);
      }
      return next;
    });
  };

  const removeSelection = (id, e) => {
    e.stopPropagation();
    setSelectedItems((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const selectedArray = Array.from(selectedItems)
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean);

  const occasion = searchParams.get("occasion");
  const material = searchParams.get("material");
  const style = searchParams.get("style");
  const type = searchParams.get("type");
  const weight = searchParams.get("weight");

  return (
    <div data-employee-fullscreen data-employee-page="canvas-grid" className="fixed inset-0 w-screen h-screen bg-[#fcfcfc] overflow-hidden select-none z-50 flex flex-col">
      {/* Top Header */}
      <div className="w-full px-8 pt-7 pb-4 flex justify-between items-center bg-transparent shrink-0 z-10">
        <div className="flex justify-start items-center w-[160px]">
          {/* Back Button */}
          <button
            onClick={onBack}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-11 h-11 bg-white/60 backdrop-blur-md rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-black pointer-events-auto border border-white/40 transition-transform hover:scale-105 shrink-0"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
        </div>

        {/* Store Name Pill — frosted glass */}
        <div className="flex justify-center items-center flex-1">
          <div data-employee-surface="pill" className="bg-gradient-to-r from-white/30 via-white/55 to-white/30 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-white/50 rounded-full px-7 py-2.5 pointer-events-auto flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400/60 shrink-0" />
            <h1 className="font-serif text-[17px] tracking-widest text-gray-800/90 whitespace-nowrap">
              {retailerName || "Jewel India"}
            </h1>
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400/60 shrink-0" />
          </div>
        </div>

        <div className="flex justify-end items-center w-[160px]">
        </div>
      </div>

      {/* Main Split Layout Content Area */}
      <div className="flex-1 w-full flex overflow-hidden relative">
        {/* Scrollable Grid Container */}
        <main className="flex-1 overflow-y-auto px-8 pb-32 pt-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <DesignCard
                  key={product.id}
                  product={product}
                  isSelected={selectedItems.has(product.id)}
                  onToggleSelect={toggleSelection}
                />
              ))}
            </div>
          </div>
        </main>

        {/* Right Sidebar - Selected Items */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute top-1/2 -translate-y-1/2 right-0 z-20 pointer-events-auto w-8 h-14 bg-white/70 backdrop-blur-md border border-white/60 rounded-l-xl shadow-lg flex items-center justify-center text-gray-600 hover:text-black hover:bg-white/90 transition-all"
            title="Show selected items"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}

        {/* Drawer backdrop for tablet portrait / mobile viewports */}
        {sidebarOpen && (
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px] z-10 lg:hidden transition-all duration-300"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div
          className="absolute top-1/2 z-20 lg:z-10 pointer-events-auto"
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          style={{
            right: sidebarOpen ? "32px" : "-320px",
            transform: "translateY(-50%)",
            transition: "right 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            width: "280px",
          }}
        >
          <div data-employee-panel className="w-full bg-white/40 backdrop-blur-2xl border border-white/60 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.12)] p-5 flex flex-col max-h-[80vh] overflow-x-hidden overflow-y-auto no-scrollbar">
            <div className="flex items-center gap-3 mb-6 shrink-0">
              <button
                onClick={() => setSidebarOpen(false)}
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-8 h-8 rounded-full bg-white/70 shadow-sm border border-white flex items-center justify-center text-gray-600 hover:text-black hover:bg-white transition-all"
                title="Hide selected items"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <h2 className="font-serif text-[18px] text-gray-800 font-medium">Selected Items</h2>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar flex flex-col gap-3 pb-4">
              {selectedArray.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-[13px] text-gray-500 italic text-center px-4">
                  Select items from the catalogue to add them here.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {selectedArray.map((item) => {
                    const thumbUrl = item.generated_image_urls?.[0] || item.processed_image_url || item.raw_image_url;
                    return (
                      <div key={item.id} className="relative group">
                        <div className="bg-white/60 rounded-xl aspect-square p-2 border border-white/50 shadow-sm flex items-center justify-center">
                          {thumbUrl ? (
                            <ProtectedImage src={thumbUrl} className="w-full h-full object-contain mix-blend-multiply" />
                          ) : (
                            <span className="text-[10px] text-gray-300">No Image</span>
                          )}
                        </div>
                        <p className="text-[10px] text-center mt-1.5 font-medium text-gray-700 truncate px-1">
                          {item.title || item.jewellery_type}
                        </p>
                        <button
                          onClick={(e) => removeSelection(item.id, e)}
                          onPointerDown={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                          onTouchEnd={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-gray-200/80 hover:bg-red-500 hover:text-white rounded-full flex items-center justify-center text-gray-600 text-[10px] opacity-0 group-hover:opacity-100 transition-all shadow-sm backdrop-blur-sm"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              onClick={onNext}
              disabled={selectedItems.size === 0}
              className="w-full py-4 mt-2 bg-gradient-to-b from-[#2a2a2a] to-[#111] text-white rounded-xl font-medium text-[14px] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-black hover:to-black transition-colors"
            >
              Next
            </button>
          </div>
        </div>

        {/* Bottom Filter Tags (Glassmorphism) */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 pointer-events-none z-10">
          <div data-employee-surface="pill" className="bg-gradient-to-r from-white/30 via-white/55 to-white/30 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-white/40 rounded-full px-10 py-3 flex gap-8 pointer-events-auto items-center">
            {occasion && (
              <div className="flex flex-col items-center">
                <span className="text-[8px] uppercase tracking-[0.15em] text-black/40 font-bold mb-0.5">Occasion</span>
                <span className="text-[13px] font-serif text-black/80">{occasion}</span>
              </div>
            )}

            {material && (
              <div className="flex flex-col items-center">
                <span className="text-[8px] uppercase tracking-[0.15em] text-black/40 font-bold mb-0.5">Material</span>
                <span className="text-[13px] font-serif text-black/80">{material}</span>
              </div>
            )}

            {style && (
              <div className="flex flex-col items-center">
                <span className="text-[8px] uppercase tracking-[0.15em] text-black/40 font-bold mb-0.5">Style</span>
                <span className="text-[13px] font-serif text-black/80">{style}</span>
              </div>
            )}

            {type && (
              <div className="flex flex-col items-center">
                <span className="text-[8px] uppercase tracking-[0.15em] text-black/40 font-bold mb-0.5">Jewellery</span>
                <span className="text-[13px] font-serif text-black/80">{type}</span>
              </div>
            )}

            {weight && (
              <div className="flex flex-col items-center">
                <span className="text-[8px] uppercase tracking-[0.15em] text-black/40 font-bold mb-0.5">Weight</span>
                <span className="text-[13px] font-serif text-black/80">{weight}</span>
              </div>
            )}

            {!occasion && !material && !style && !type && !weight && (
              <div className="flex flex-col items-center">
                <span className="text-[8px] uppercase tracking-[0.15em] text-black/40 font-bold mb-0.5">Filter</span>
                <span className="text-[13px] font-serif text-black/80">All Items</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product Info Modal */}
      <ProductInfoModal
        isOpen={!!viewingProductForModal}
        onClose={() => setViewingProductForModal(null)}
        product={viewingProductForModal}
      />
    </div>
  );
}
