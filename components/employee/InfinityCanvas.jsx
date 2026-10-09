"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, memo } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import gsap from "gsap";
import { Observer } from "gsap/Observer";
import useLongPress from "@/lib/hooks/useLongPress";

const ProductInfoModal = dynamic(
  () => import("./ProductInfoModal").then((mod) => mod.ProductInfoModal),
  { loading: () => null }
);

const CanvasTile = memo(function CanvasTile({ product, isSelected, toggleSelection, elRef, router }) {
  const imgUrl = product.generated_image_urls?.[0] || product.processed_image_url || product.raw_image_url;

  const longPressProps = useLongPress({
    onLongPress: () => toggleSelection(product),
    onClick: () => router.push(`/dashboard/employee/playground/review?productId=${product.id}`),
    delay: 500,
  });

  return (
    <div 
      ref={elRef}
      className={`absolute top-0 left-0 cursor-pointer will-change-transform group/tile`}
      style={{ width: "260px", height: "360px" }}
      {...longPressProps}
    >
      <div className={`w-full h-full bg-white flex flex-col transition-all duration-300 rounded-[2px] overflow-hidden ${
        isSelected ? 'border-[3px] border-[#007AFF] shadow-lg scale-[0.97]' : 'border border-gray-100 shadow-sm hover:shadow-xl hover:scale-[1.02]'
      } ${longPressProps.isPressing ? 'scale-[0.95] opacity-80' : ''}`}>
        <div className="w-full bg-gray-50 flex items-center justify-center p-4 overflow-hidden relative" style={{ flex: "1 1 0", minHeight: 0 }}>
          {imgUrl ? (
            <img src={imgUrl} alt={product.title} className="w-full h-full object-cover mix-blend-multiply pointer-events-none rounded-sm" />
          ) : (
            <span className="text-gray-300">No Image</span>
          )}
        </div>
        <div className="px-4 py-3 text-center bg-white border-t border-gray-100 shrink-0" style={{ minHeight: "52px" }}>
          <h3 className="font-serif text-[15px] text-gray-800 leading-snug line-clamp-2">
            {product.title || product.jewellery_type || "Jewellery"}
          </h3>
        </div>
      </div>
    </div>
  );
});

export default function InfinityCanvas({ products, onBack, onNext, retailerName, selectedItems, setSelectedItems, onToggleLayout }) {
  const containerRef = useRef(null);
  const wrapperRef = useRef(null);
  const [viewingProductForModal, setViewingProductForModal] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();


  // Use refs for GSAP animation to avoid state re-renders
  const targetX = useRef(0);
  const targetY = useRef(0);
  const currentX = useRef(0);
  const currentY = useRef(0);

  // Refs for items
  const itemRefs = useRef([]);

  // Grid Configuration
  const COLS = 12;
  const ROWS = 8;
  const tileW = 280; // Width + gap
  const tileH = 360; // Height + gap
  const totalW = COLS * tileW;
  const totalH = ROWS * tileH;

  // We duplicate products to create a massive virtual canvas
  const repeatedProducts = [];
  for (let i = 0; i < COLS * ROWS; i++) {
    const p = products[i % products.length];
    if (p) repeatedProducts.push({ ...p, uniqueId: `${p.id}-${i}`, index: i });
  }

  useEffect(() => {
    gsap.registerPlugin(Observer);
    
    // Lock body scroll
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.height = "100%";

    // GSAP Wrap Functions for infinite looping
    const wrapX = gsap.utils.wrap(-tileW, totalW - tileW);
    const wrapY = gsap.utils.wrap(-tileH, totalH - tileH);

    // GSAP Lerp for 2D panning
    const updateCanvas = () => {
      // Very slow wandering auto-drift (changes direction over time)
      const t = Date.now() * 0.0002;
      targetX.current += Math.cos(t) * 0.1;
      targetY.current += Math.sin(t * 0.7) * 0.1;

      // Lerp
      currentX.current += (targetX.current - currentX.current) * 0.08;
      currentY.current += (targetY.current - currentY.current) * 0.08;
      
      itemRefs.current.forEach((el, i) => {
        if (!el) return;
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        
        // Base coordinate
        const baseX = col * tileW;
        
        // Masonry stagger
        const staggerY = (col % 4) * 60;
        const baseY = row * tileH + staggerY;

        // Apply pan offset and wrap
        const x = wrapX(baseX + currentX.current);
        const y = wrapY(baseY + currentY.current);

        gsap.set(el, { x, y });
      });
    };

    gsap.ticker.add(updateCanvas);

    // Setup Observer for Drag & Wheel
    const observer = Observer.create({
      target: containerRef.current,
      type: "pointer,touch,wheel",
      wheelSpeed: -1,
      tolerance: 5,
      preventDefault: false, // allow clicks
      onChange: (self) => {
        // Delta from wheel or drag
        targetX.current += self.deltaX * 2.5;
        targetY.current += self.deltaY * 2.5;
      }
    });

    // Initial center position offest
    setTimeout(() => {
      targetX.current = window.innerWidth / 2;
      targetY.current = window.innerHeight / 2;
    }, 100);

    return () => {
      observer.kill();
      gsap.ticker.remove(updateCanvas);
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.height = "";
    };
  }, [products]);

  const toggleSelection = (product) => {
    setSelectedItems(prev => {
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
    setSelectedItems(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };



  const handleNext = () => {
    // Save to session storage and proceed
    sessionStorage.setItem('employee_selected_products', JSON.stringify(Array.from(selectedItems)));
    onNext();
  };

  const selectedArray = Array.from(selectedItems).map(id => products.find(p => p.id === id)).filter(Boolean);

  const occasion = searchParams.get("occasion");
  const material = searchParams.get("material");
  const style = searchParams.get("style");
  const type = searchParams.get("type");
  const weight = searchParams.get("weight");

  return (
    <div 
      ref={containerRef}
      data-employee-fullscreen
      data-employee-page="canvas"
      className="fixed inset-0 w-screen h-screen bg-[#fcfcfc] overflow-hidden cursor-grab active:cursor-grabbing select-none z-50"
    >
      {/* The massive panning wrapper */}
      <div 
        ref={wrapperRef}
        className="absolute top-0 left-0 w-full h-full"
      >
        {repeatedProducts.map((product, idx) => {
          const isSelected = selectedItems.has(product.id);
          return (
            <CanvasTile
              key={product.uniqueId}
              product={product}
              isSelected={isSelected}
              toggleSelection={toggleSelection}
              elRef={el => itemRefs.current[idx] = el}
              router={router}
            />
          );
        })}
      </div>

      {/* --- UI OVERLAYS --- */}

      {/* Top Fade Gradient — softens cards crashing into the header zone */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none z-[9]"
        style={{
          height: "120px",
          background: "linear-gradient(to bottom, rgba(252,252,252,0.92) 0%, rgba(252,252,252,0.5) 55%, transparent 100%)",
        }}
      />      {/* Top Header */}
      <div className="absolute top-0 left-0 right-0 px-8 pt-7 flex justify-between items-center pointer-events-none z-10">
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
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          </button>
        </div>

        {/* Store Name Pill — frosted glass, matches bottom filter bar */}
        <div className="flex justify-center items-center flex-1">
          <div data-employee-surface="pill" className="bg-gradient-to-r from-white/30 via-white/55 to-white/30 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-white/50 rounded-full px-7 py-2.5 pointer-events-auto flex items-center gap-2">
            {/* Small jewel dot accent */}
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

      {/* Bottom Filter Tags (Glassmorphism) */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 pointer-events-none z-10">
        <div 
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          data-employee-surface="pill" className="bg-gradient-to-r from-white/30 via-white/55 to-white/30 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-white/40 rounded-full px-10 py-3 flex gap-8 pointer-events-auto items-center"
        >
          
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

      {/* Right Sidebar - Selected Items */}
      {/* Floating toggle button — visible only when sidebar is hidden */}
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
          {/* Left arrow — clicking brings panel back */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      <div
        className="absolute top-1/2 z-10 pointer-events-auto"
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
            {/* Toggle button — inside panel, collapses it to the right */}
            <button
              onClick={() => setSidebarOpen(false)}
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-8 h-8 rounded-full bg-white/70 shadow-sm border border-white flex items-center justify-center text-gray-600 hover:text-black hover:bg-white transition-all"
              title="Hide selected items"
            >
              {/* Right arrow — clicking hides panel */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <h2 className="font-serif text-[18px] text-gray-800">Selected Items</h2>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar flex flex-col gap-3 pb-4">
            {selectedArray.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-[13px] text-gray-500 italic text-center px-4">
                Tap items on the canvas to select them.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {selectedArray.map(item => (
                  <div key={item.id} className="relative group">
                    <div className="bg-white/60 rounded-xl aspect-square p-2 border border-white/50 shadow-sm flex items-center justify-center">
                      <img src={item.generated_image_urls?.[0] || item.processed_image_url || item.raw_image_url} className="w-full h-full object-contain mix-blend-multiply" />
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
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleNext}
            disabled={selectedItems.size === 0}
            className="w-full py-4 mt-2 bg-gradient-to-b from-[#2a2a2a] to-[#111] text-white rounded-xl font-medium text-[14px] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-black hover:to-black transition-colors"
          >
            Next
          </button>
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
