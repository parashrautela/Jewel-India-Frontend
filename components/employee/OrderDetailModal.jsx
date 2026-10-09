"use client";

import { useEffect, useState } from "react";
import FullImageViewer from "../shared/FullImageViewer";
import ProtectedImage from "../shared/ProtectedImage";

function ToggleSwitch({ isOn, onToggle }) {
  return (
    <div 
      className={`w-11 h-6 rounded-full flex items-center px-1 cursor-pointer transition-colors ${isOn ? 'bg-green-500' : 'bg-gray-300'}`}
      onClick={onToggle}
    >
      <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${isOn ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
  );
}

export function OrderDetailModal({ order, onClose }) {
  const [inStock, setInStock] = useState(true);
  const [published, setPublished] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isFullViewOpen, setIsFullViewOpen] = useState(false);

  // Prevent scrolling when open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "unset"; };
  }, []);

  if (!order) return null;

  const p = order.products || {};
  
  const images = Array.from(new Set([
    p.processed_image_url,
    ...(p.generated_image_urls || []),
    p.raw_image_url,
  ].filter(Boolean)));
  if (images.length === 0) {
    images.push("https://images.unsplash.com/photo-1599643478514-4a1101859efc?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80");
  }

  const imgUrl = images[activeImageIndex] || images[0];
  const sku = order.id ? order.id.split("-")[0].toUpperCase() : "JK65-JI-1983844";
  const title = p.jewellery_type ? p.jewellery_type.charAt(0).toUpperCase() + p.jewellery_type.slice(1) : "Necklace";
  const purity = p.metal_purity || "18 KT";
  const netWeight = p.net_weight ? `${p.net_weight}g` : "9.8g";
  const grossWeight = p.gross_weight ? `${p.gross_weight}g` : "10g";
  const stoneWeight = p.stone_weight ? `${p.stone_weight}g` : "0.2g";



  return (
    <div data-employee-fullscreen className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 md:p-12">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div data-employee-dialog className="bg-white w-full max-w-5xl rounded-[16px] shadow-2xl relative z-10 animate-fade-in-up max-h-[95vh] overflow-y-auto flex flex-col no-scrollbar pb-10">
        
        {/* Close Button at Modal Level */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-50 w-9 h-9 flex items-center justify-center bg-gray-50/80 hover:bg-gray-100 rounded-[10px] text-gray-400 hover:text-gray-700 transition-colors backdrop-blur-xs"
          aria-label="Close modal"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        {/* Top Section */}
        <div className="flex flex-col md:flex-row p-8 md:p-10 gap-10">
          
          {/* Left Column (Images) */}
          <div className="w-full md:w-1/2 flex flex-col gap-4">
            <div 
              onClick={() => setIsFullViewOpen(true)}
              className="w-full aspect-[4/3] bg-[#f9f9f9] rounded-[12px] overflow-hidden flex items-center justify-center p-4 cursor-pointer relative group/mainimg"
            >
              <ProtectedImage src={imgUrl} alt={title} className="w-full h-full object-contain mix-blend-multiply transition-transform duration-300 group-hover/mainimg:scale-[1.02]" />
              <div className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/85 backdrop-blur-sm shadow-sm flex items-center justify-center text-gray-700 opacity-0 group-hover/mainimg:opacity-100 transition-opacity active:scale-90 pointer-events-none md:pointer-events-auto">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                </svg>
              </div>
            </div>
            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1 max-w-full">
                {images.map((url, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setActiveImageIndex(idx)}
                    className={`shrink-0 w-[64px] h-[64px] bg-[#f9f9f9] rounded-[8px] overflow-hidden border cursor-pointer p-2 transition-all ${activeImageIndex === idx ? 'border-black opacity-100 scale-105 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  >
                    <ProtectedImage src={url} alt="Thumbnail" className="w-full h-full object-contain mix-blend-multiply" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column (Details) */}
          <div className="w-full md:w-1/2 flex flex-col pt-2 relative">
            
            {/* Spacer for title area spacing */}
            <div className="h-6 md:h-0" />

            {/* Title & SKU */}
            <div className="mt-2 mb-4">
              <h2 className="text-[18px] text-gray-500 font-medium mb-1">
                SKU <span className="font-bold text-[#111827] ml-2">#{sku}</span>
              </h2>
              <p className="text-[14px] text-gray-400">{title}</p>
            </div>



            {/* In Stock Row */}
            <div className="flex items-center gap-3 text-[13px] mb-8">
              <div className="flex items-center gap-1.5 text-green-600 font-medium">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                In stock
              </div>
              <span className="text-gray-300">|</span>
              <span className="text-gray-400">{grossWeight}</span>
            </div>

            {/* Toggles and Specs */}
            <div className="flex flex-col gap-6">
              {/* Available in stock */}
              <div className="flex justify-between items-center pr-2">
                <span className="text-[14px] text-gray-700 font-medium">Available in stock</span>
                <ToggleSwitch isOn={inStock} onToggle={() => setInStock(!inStock)} />
              </div>

              {/* Specifications Box */}
              <div className="bg-[#f8f9fa] rounded-[16px] p-6 pr-8">
                <h3 className="text-[14px] font-medium text-gray-700 mb-4">Specifications</h3>
                <div className="flex flex-col gap-3 text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Purity</span>
                    <span className="text-gray-800 font-medium">{purity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Gross weight</span>
                    <span className="text-gray-800 font-medium">{grossWeight}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Net weight</span>
                    <span className="text-gray-800 font-medium">{netWeight}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Stone weight</span>
                    <span className="text-gray-800 font-medium">{stoneWeight}</span>
                  </div>
                </div>
              </div>

              {/* Publish to Collection */}
              <div className="flex justify-between items-center pr-2">
                <span className="text-[14px] text-gray-700 font-medium">Publish to Collection</span>
                <ToggleSwitch isOn={published} onToggle={() => setPublished(!published)} />
              </div>
            </div>

          </div>
        </div>



      </div>

      {/* Immersive Tablet-First Full Image Viewer Overlay */}
      <FullImageViewer
        isOpen={isFullViewOpen}
        onClose={() => setIsFullViewOpen(false)}
        images={images}
        activeIndex={activeImageIndex}
        onChangeIndex={(idx) => setActiveImageIndex(idx)}
      />
    </div>
  );
}
