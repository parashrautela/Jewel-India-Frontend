"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import Image from "next/image";
import RetailerCatalogueSearch from "./RetailerCatalogueSearch";
import { searchableProducts, productSearchImage } from "../../lib/catalogue/search.mjs";

const ProductInfoModal = dynamic(
  () => import("../employee/ProductInfoModal").then((mod) => mod.ProductInfoModal),
  { loading: () => null }
);

function formatWeight(val) {
  if (!val && val !== 0) return null;
  return `${Number(val).toFixed(2)}g`;
}

function ProductCard({ product, isSelected, onToggle, onClick, disabled }) {
  const [imgError, setImgError] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const imageUrl = productSearchImage(product);
  const title = product.title || product.jewellery_type || "Untitled";

  const handleToggle = async (e) => {
    e.stopPropagation();
    if (isUpdating || disabled) return;
    setIsUpdating(true);
    await onToggle(product.id, !isSelected);
    setIsUpdating(false);
  };

  return (
    <article 
      className="group flex flex-col bg-transparent overflow-hidden cursor-pointer"
      onClick={() => onClick && onClick(product)}
    >
      {/* Image */}
      <div className="relative aspect-square w-full overflow-hidden bg-white border-b-2 border-[#484848]">
        {!imgError && imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="h-full w-full object-contain mix-blend-multiply transition-transform duration-700 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[12px] text-gray-400">
            No image
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-col gap-[8px] pt-[8px]">
        <h3 className="text-[14px] leading-[17.5px] font-bold text-[#1a1a1a] line-clamp-1">
          {title}
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-[12px] leading-[18px] text-[#888]">
            {formatWeight(product.net_weight) || "20g"}
          </span>
          
          {/* Selection changes only after an explicit retailer action. */}
          <button
            type="button"
            role="switch"
            aria-label={`Show ${title} to employees`}
            aria-checked={isSelected}
            disabled={isUpdating || disabled}
            onClick={handleToggle}
            data-selected={isSelected}
            className="relative w-[40px] h-[20px] rounded-full transition-colors disabled:opacity-50 bg-[#E5E5EA] data-[selected=true]:bg-[#27ae60] focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            <span className={`absolute top-[2px] left-[4px] bg-white w-[16px] h-[16px] rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.1)] transition-transform ${isSelected ? 'translate-x-[16px]' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>
    </article>
  );
}

export default function YourTasteClient({ products, selectedProductIds, categoryTabs }) {
  const [filterState, setFilterState] = useState("all"); // "all", "selected", "unselected"
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [selectionError, setSelectionError] = useState("");

  
  // Local optimistic state for selections
  const [selections, setSelections] = useState(() => new Set(selectedProductIds));

  const handleToggleSelection = async (productId, isSelected, clearError = true) => {
    if (clearError) setSelectionError("");
    setSelections(prev => {
      const newSet = new Set(prev);
      if (isSelected) newSet.add(productId);
      else newSet.delete(productId);
      return newSet;
    });

    try {
      const res = await fetch("/api/retailer/your-taste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, selected: isSelected })
      });
      if (!res.ok) throw new Error("Failed");
      return true;
    } catch {
      setSelectionError("Some selections could not be saved. Please try again.");
      setSelections(prev => {
        const newSet = new Set(prev);
        if (isSelected) newSet.delete(productId);
        else newSet.add(productId);
        return newSet;
      });
      return false;
    }
  };

  const originalProducts = useMemo(() => new Map(products.map(product => [product.id, product])), [products]);
  const searchProducts = useMemo(() => searchableProducts(products), [products]);
  const filterSelections = (items) => items.filter(p => filterState === "all" || (filterState === "selected" ? selections.has(p.id) : !selections.has(p.id)));

  // Only apply a bulk action to currently displayed results that need a change.
  const handleBulkToggle = async (selectAll, displayedProducts) => {
    setIsBulkUpdating(true);
    setSelectionError("");
    const targets = displayedProducts.filter(product => selections.has(product.id) !== selectAll);
    try {
      // Bound concurrent writes for the full catalogue.
      for (let index = 0; index < targets.length; index += 10) {
        await Promise.all(targets.slice(index, index + 10).map(product => handleToggleSelection(product.id, selectAll, false)));
      }
    } finally { setIsBulkUpdating(false); }
  };

  return (
    <div className="flex-1 w-full max-w-[1058px] px-6 lg:pl-0 lg:pr-9 pt-[27px] pb-10 flex flex-col gap-[28px]">
      {/* Header */}
      <div>
        <h1 className="text-[24px] leading-[32px] font-bold text-[#0f172b] tracking-[0.07px] mb-[4px]">
          Your Taste
        </h1>
        <p className="text-[14px] leading-[20px] font-medium text-[#62748e] tracking-[-0.15px]">
          Let&apos;s curate the product which justifies your store and your taste
        </p>
      </div>

      {/* Main Box Area */}
      <div className="flex flex-col gap-8 relative bg-white rounded-[24px] px-[35px] pt-[43px] pb-[40px] min-h-[695px]">
        
        <RetailerCatalogueSearch
          designs={searchProducts}
          categoryOptions={categoryTabs}
          renderCategories={(activeCategory, setActiveCategory) => <>
        {/* Categories Row */}
        <div className="flex flex-wrap gap-[8px] md:gap-x-[8px] items-end justify-start">
          {categoryTabs.map((tab) => {
            const isActive = activeCategory === tab.slug;
            return (
              <button
                key={tab.slug}
                onClick={() => setActiveCategory(tab.slug === activeCategory ? "all" : tab.slug)}
                className="flex flex-col items-center gap-[4px] group outline-none w-[104px]"
              >
                <div 
                  className={`rounded-[8px] overflow-hidden transition-all duration-300 bg-gradient-to-b from-[#f6e0a7] to-[#bb8651] relative ${isActive ? 'w-[88px] h-[88px]' : 'w-[64px] h-[64px] hover:scale-105'}`}
                >
                  {tab.image ? (
                    <Image 
                      src={tab.image} 
                      alt={tab.name} 
                      width={88} 
                      height={88} 
                      className="w-full h-full object-cover block" 
                    />
                  ) : (
                    <div className="w-full h-full bg-[#F9F9F9] flex items-center justify-center text-[#111827] text-xs font-bold">
                      {tab.name.charAt(0)}
                    </div>
                  )}
                </div>
                <span className={`text-[16px] text-center whitespace-nowrap transition-colors ${isActive ? 'text-[#545454] font-bold' : 'text-[#a9a9a9] font-medium group-hover:text-[#545454]'}`}>
                  {tab.name}
                </span>
              </button>
            );
          })}
          
          <button 
            onClick={() => setActiveCategory("all")}
            className="flex items-center gap-[8px] ml-[8px] self-center text-black font-bold text-[16px] leading-[1.5]"
          >
            <span className="underline">View All</span>
            <img src="/retailer-admin/arrow-right-long.svg" alt="" width={24} height={24} className="-scale-y-100 rotate-180" />
          </button>
        </div>

          </>}
          renderResults={(visibleProducts, searchBusy) => {
            const filteredProducts = filterSelections(visibleProducts.map(product => originalProducts.get(product.id)).filter(Boolean));
            return <>
        {/* Filters + Bulk Actions bar */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          {/* Left: view-filter chips */}
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => setFilterState(filterState === "selected" ? "all" : "selected")}
              className={`flex items-center gap-1.5 px-[16px] h-[40px] rounded-full text-[14px] font-medium tracking-[-0.15px] transition-colors ${filterState === "selected" ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Already selected
              {filterState === "selected" && <img src="/retailer-admin/x-white.svg" alt="" width={12} height={12} className="ml-[4px]" />}
            </button>
            <button
              onClick={() => setFilterState(filterState === "unselected" ? "all" : "unselected")}
              className={`flex items-center gap-1.5 px-[16px] h-[40px] rounded-full text-[14px] font-medium tracking-[-0.15px] transition-colors ${filterState === "unselected" ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Show Unselected
              {filterState === "unselected" && <img src="/retailer-admin/x-white.svg" alt="" width={12} height={12} className="ml-[4px]" />}
            </button>
          </div>

          {/* Right: bulk action buttons */}
          <div className="flex gap-2 items-center">
            <button
              onClick={() => handleBulkToggle(true, filteredProducts)}
              disabled={searchBusy || isBulkUpdating || filteredProducts.length === 0}
              className="flex items-center gap-2 px-4 h-11 md:h-auto py-0 md:py-2 rounded-full text-[12px] font-bold tracking-wide bg-[#22C55E] text-white hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isBulkUpdating ? (
                <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              )}
              Publish All
            </button>
            <button
              onClick={() => handleBulkToggle(false, filteredProducts)}
              disabled={searchBusy || isBulkUpdating || filteredProducts.length === 0}
              className="flex items-center gap-2 px-4 h-11 md:h-auto py-0 md:py-2 rounded-full text-[12px] font-bold tracking-wide bg-gray-800 text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isBulkUpdating ? (
                <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              )}
              Unpublish All
            </button>
          </div>
        </div>

        {selectionError && <p role="alert" className="text-sm text-red-700">{selectionError}</p>}

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-[repeat(4,216px)] gap-x-[28px] gap-y-[40px]">
          {!searchBusy && filteredProducts.map((p) => (
            <ProductCard 
              key={p.id} 
              product={p} 
              isSelected={selections.has(p.id)}
              disabled={isBulkUpdating}
              onToggle={handleToggleSelection}
              onClick={(prod) => setSelectedProduct(prod)}
            />
          ))}
          {!searchBusy && filteredProducts.length === 0 && (
            <div className="col-span-full py-20 text-center text-[#6B7280]">
              <p className="text-lg font-medium">No products found matching the criteria.</p>
              <p className="text-sm mt-1">Try selecting a different category or clearing filters.</p>
            </div>
          )}
          {searchBusy && <p role="status" className="col-span-full py-12 text-center text-sm text-gray-500">Looking for similar products…</p>}
        </div>
            </>;
          }}
        />
      </div>

      {/* Product Detail Modal */}
      <ProductInfoModal 
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        product={selectedProduct}
      />
    </div>
  );
}
