"use client";

import { useState, useEffect, useRef, memo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import FullImageViewer from "../../shared/FullImageViewer";
import ProtectedImage from "../../shared/ProtectedImage";
import { clearProductImages } from "../../../lib/actions/products";
import { reprocessProduct, pollForResult } from "../../../lib/api/products";

// ── Product Detail Modal ──────────────────────────────────────────────────────
function ProductDetailModal({ product, onClose, onUpdate, wholesalerId, isLimitReached }) {
  if (!product) return null;

  // TODO: replace with Supabase product/processed/{product.sku} fetch once SKU is available
  const images = Array.from(new Set([
    ...(product.showcase_image_urls || []),
    ...(product.generated_image_urls || []),
    product.processed_image_url,
    product.image_url,
    product.raw_image_url,
  ].filter(Boolean)));

  const hasImages = images.length > 0;
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const activeImageUrl = images[activeImageIndex] || null;
  const [isFullViewOpen, setIsFullViewOpen] = useState(false);

  const router = useRouter();
  const [isUpdatingPublish, setIsUpdatingPublish] = useState(false);
  const [isPublished, setIsPublished] = useState(product.is_published ?? true);

  // States for reprocessing
  const [showConfirm, setShowConfirm] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [reprocessStatus, setReprocessStatus] = useState("");
  const [reprocessError, setReprocessError] = useState(null);
  const [newImageFile, setNewImageFile] = useState(null);
  const [newImagePreview, setNewImagePreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (newImagePreview) {
        URL.revokeObjectURL(newImagePreview);
      }
    };
  }, [newImagePreview]);

  const handleFileSelect = (file) => {
    if (!file) return;
    if (newImagePreview) {
      URL.revokeObjectURL(newImagePreview);
    }
    const url = URL.createObjectURL(file);
    setNewImageFile(file);
    setNewImagePreview(url);
  };

  const handleRemoveFile = () => {
    if (newImagePreview) {
      URL.revokeObjectURL(newImagePreview);
    }
    setNewImageFile(null);
    setNewImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCancelConfirm = () => {
    setShowConfirm(false);
    handleRemoveFile();
  };

  const handleCloseModal = () => {
    if (newImagePreview) {
      URL.revokeObjectURL(newImagePreview);
    }
    setNewImageFile(null);
    setNewImagePreview(null);
    setShowConfirm(false);
    onClose();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Data fallbacks/parsing
  const title = product.title || (product.jewellery_type ? product.jewellery_type.charAt(0).toUpperCase() + product.jewellery_type.slice(1) : "Jewelry Piece");
  const skuStr = product.sku || `JWL-${(product.id || "0000").slice(-6).toUpperCase()}`;
  const category = product.category || "Jewellery";
  const purity = product.purity || product.metal_purity || "24K";
  
  // Mock stats
  const savesCount = product.saves_count ?? "1.2k";
  const likesCount = product.likes_count ?? "3.4k";
  const viewsCount = product.views_count ?? "12.5k";
  const isInStock = product.stock_available ?? false;
  const weightStr = product.net_weight ? `${product.net_weight}g` : "20g";

  const handleTogglePublish = async () => {
    const newValue = !isPublished;
    setIsPublished(newValue);
    setIsUpdatingPublish(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: newValue }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch (err) {
      setIsPublished(!newValue);
    } finally {
      setIsUpdatingPublish(false);
    }
  };

  const handleEdit = () => {
    router.push(`/dashboard/wholesaler/edit-product/${product.id}`);
  };

  const handleShare = async () => {
    try {
      const url = `${window.location.origin}/dashboard/wholesaler/products/${product.id}`;
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Link copied!");
      }
    } catch (e) {
    }
  };

  const handleReprocess = async () => {
    setShowConfirm(false);
    setIsReprocessing(true);
    setReprocessError(null);
    setReprocessStatus("Initiating re-upload...");

    try {
      // 1. Clear existing images in Supabase to start fresh
      setReprocessStatus("Clearing old images...");
      const clearRes = await clearProductImages(product.id);
      if (clearRes.error) {
        throw new Error(clearRes.error);
      }

      // 2. Call backend reprocessing endpoint
      setReprocessStatus("Queueing AI pipeline...");
      await reprocessProduct(product.id, wholesalerId, newImageFile);

      // 3. Poll for results
      setReprocessStatus("AI processing in progress...");
      const variantUrls = await pollForResult(product.id, (bgUrl) => {
        setReprocessStatus("Background removed, enhancing...");
      });

      // 4. Update parent and local state
      const updatedProduct = {
        ...product,
        processed_image_url: variantUrls[0] || null,
        generated_image_urls: variantUrls,
      };

      setReprocessStatus("Processing complete!");
      onUpdate?.(updatedProduct);

      // Clean up local preview/file state on successful processing
      if (newImagePreview) {
        URL.revokeObjectURL(newImagePreview);
      }
      setNewImageFile(null);
      setNewImagePreview(null);
      
      setTimeout(() => {
        setIsReprocessing(false);
        setReprocessStatus("");
      }, 1500);

    } catch (err) {
      if (err.status !== 429) {
        alert(err.message);
      }
      setReprocessError(err.message || "Failed to reprocess product");
      setReprocessStatus("error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.4)] backdrop-blur-sm p-4 overflow-hidden" onClick={handleCloseModal}>
      <div 
        className="relative bg-white rounded-[24px] shadow-[0_16px_40px_rgba(0,0,0,0.12)] w-full max-w-[1000px] max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Column - Image Viewer (~58%) */}
        <div className="w-full md:w-[58%] p-6 flex flex-col gap-4 border-b md:border-b-0 md:border-r border-[#f0f0f0]">
          {/* Main Image */}
          <div 
            onClick={() => {
              if (isReprocessing || reprocessStatus === "error") return;
              if (activeImageUrl) setIsFullViewOpen(true);
            }}
            className={`w-full aspect-square bg-[#F5F5F5] rounded-[16px] flex items-center justify-center overflow-hidden relative ${isReprocessing || reprocessStatus === "error" ? "cursor-default" : "cursor-pointer group/mainimg"}`}
          >
            {isReprocessing ? (
              <div className="absolute inset-0 bg-[#F5F5F5] flex flex-col items-center justify-center p-6 text-center gap-4">
                {reprocessStatus === "error" ? (
                  <>
                    <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-[16px] font-bold text-red-600">Reprocessing Failed</p>
                      <p className="text-[12px] text-[#666] max-w-[240px] mx-auto leading-relaxed">{reprocessError}</p>
                    </div>
                    <button
                      onClick={() => {
                        setIsReprocessing(false);
                        setReprocessStatus("");
                      }}
                      className="px-6 py-2 bg-black text-white rounded-full text-[13px] font-semibold hover:bg-black/90 cursor-pointer transition-colors"
                    >
                      Close
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 border-[1.5px] border-gray-300 border-t-black rounded-full animate-spin" />
                    <div className="flex flex-col gap-1">
                      <p className="text-[16px] font-bold text-[#1A1A1A]">{reprocessStatus}</p>
                      <p className="text-[12px] text-[#888]">This may take up to a minute</p>
                    </div>
                  </>
                )}
              </div>
            ) : activeImageUrl ? (
              <>
                <ProtectedImage
                  src={activeImageUrl}
                  alt={title}
                  className="w-full h-full object-contain mix-blend-multiply transition-transform duration-300 group-hover/mainimg:scale-[1.02]"
                />
                <div className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/85 backdrop-blur-sm shadow-sm flex items-center justify-center text-gray-700 opacity-0 group-hover/mainimg:opacity-100 transition-opacity active:scale-90 pointer-events-none md:pointer-events-auto">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                  </svg>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-[#999] gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.5 2h11l4 6-9.5 14L2.5 8l4-6z" />
                </svg>
                <span className="text-[14px]">No Image Found</span>
              </div>
            )}
          </div>
          
          {/* Thumbnail Strip */}
          {!isReprocessing && hasImages && (
            <div className="flex gap-3 pb-2 custom-scrollbar overflow-x-auto">
              {images.slice(0, 4).map((imgUrl, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`shrink-0 w-[64px] h-[64px] md:w-[72px] md:h-[72px] rounded-[10px] bg-[#f5f5f5] overflow-hidden transition-all border-2 ${activeImageIndex === idx ? 'border-[#111] opacity-30' : 'border-transparent opacity-100'}`}
                >
                  <ProtectedImage
                    src={imgUrl}
                    alt={`Thumb ${idx}`}
                    width={72}
                    height={72}
                    className="w-full h-full object-cover mix-blend-multiply"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Product Info (~42%) */}
        <div className="w-full md:w-[42%] p-8 flex flex-col relative">
          
          {/* Top Right Actions */}
          <div className="absolute top-6 right-6 flex items-center gap-3">
            <button onClick={handleEdit} className="text-[#999] hover:text-[#111] transition-colors bg-transparent border-none p-0 outline-none cursor-pointer" aria-label="Edit">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button onClick={handleCloseModal} className="text-[#999] hover:text-[#111] transition-colors ml-2 bg-transparent border-none p-0 outline-none cursor-pointer" aria-label="Close">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div className="pr-[60px] md:pr-[100px] mb-6">
            <h2 className="text-[20px] font-bold text-[#1A1A1A] leading-tight break-all sm:break-normal">{title}</h2>
            <p className="text-[14px] text-[#888] mt-1">{category} • {skuStr}</p>
          </div>


          {/* Stock Line */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isInStock ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`}></span>
              <span className={`text-[14px] font-bold ${isInStock ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                {isInStock ? 'In stock' : 'Out of stock'}
              </span>
            </div>
            <span className="text-[#ccc]">|</span>
            <span className="text-[14px] text-[#888]">{weightStr}</span>
          </div>

          {/* Specifications Card */}
          <div className="bg-[#F8F8F8] rounded-[12px] p-5 mb-8">
            <h3 className="text-[14px] font-semibold text-[#1A1A1A] mb-4">Specifications</h3>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-[14px] text-[#666]">Purity</span>
                <span className="text-[14px] font-semibold text-[#1A1A1A]">{purity}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[14px] text-[#666]">Gross weight</span>
                <span className="text-[14px] font-semibold text-[#1A1A1A]">{product.gross_weight ? `${product.gross_weight}g` : '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[14px] text-[#666]">Stone weight</span>
                <span className="text-[14px] font-semibold text-[#1A1A1A]">{product.stone_weight ? `${product.stone_weight}g` : '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[14px] text-[#666]">Net weight</span>
                <span className="text-[14px] font-semibold text-[#1A1A1A]">{product.net_weight ? `${product.net_weight}g` : '-'}</span>
              </div>
            </div>
          </div>

          {/* Re-upload to AI Button */}
          <div className="mt-auto mb-4 pt-4 border-t border-[#f0f0f0]">
            <button
              onClick={() => setShowConfirm(true)}
              disabled={isReprocessing || isLimitReached}
              className="w-full py-3 rounded-xl border border-[#111] hover:bg-[#111] hover:text-white text-[#111] text-[14px] font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
              </svg>
              {isLimitReached ? "Daily upload limit reached" : (!hasImages ? "Upload Image to AI" : "Re-upload to AI")}
            </button>
          </div>

          {/* Publish Toggle */}
          <div className="flex items-center justify-between pt-4 border-t border-[#f0f0f0]">
            <span className="text-[15px] font-semibold text-[#1A1A1A]">Publish to Retailer</span>
            <button
              onClick={handleTogglePublish}
              disabled={isUpdatingPublish}
              className={`relative w-[50px] h-7 rounded-full transition-colors duration-300 ease-in-out focus:outline-none disabled:opacity-50 border-none cursor-pointer ${isPublished ? 'bg-[#34C759]' : 'bg-[#E5E5EA]'}`}
            >
              <span className={`absolute top-[2px] left-[2px] bg-white w-[24px] h-[24px] rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-transform duration-300 ease-in-out ${isPublished ? 'translate-x-[22px]' : 'translate-x-0'}`} />
            </button>
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

      {/* Re-upload Confirmation Dialog */}
      {showConfirm && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={(e) => {
            e.stopPropagation();
            handleCancelConfirm();
          }}
        >
          <div 
            className="bg-white rounded-[24px] p-6 max-w-md w-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col gap-5 text-center animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            
            <div className="flex flex-col gap-1">
              <h4 className="text-[18px] font-bold text-[#1A1A1A] font-sans">
                {!hasImages ? "Upload Image to AI" : "Re-upload to AI?"}
              </h4>
              <p className="text-[13px] text-[#666] leading-relaxed">
                {!hasImages
                  ? "Select a base photo below to start the AI processing pipeline for this product."
                  : "This will clear the current processed results. You can optionally replace the base image below."}
              </p>
            </div>

            {/* Drag & Drop Zone */}
            <div className="w-full flex flex-col gap-2 text-left">
              <span className="text-[12px] font-semibold text-[#1A1A1A] font-sans">Base Photo Selection</span>
              
              {!newImagePreview ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full h-[140px] border-2 border-dashed rounded-[16px] flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                    dragOver
                      ? "border-[#1a1a1a] bg-[#f5f5f5]"
                      : "border-[#ddd] hover:border-[#1a1a1a] bg-[#F9F9F9] hover:bg-[#f5f5f5]"
                  }`}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#666]">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <div className="text-center px-4">
                    <p className="text-[12px] font-semibold text-[#333]">Drag new image here, or browse</p>
                    <p className="text-[11px] text-[#888] mt-0.5">
                      {!hasImages ? "JPEG, PNG, or WebP is required." : "JPEG, PNG, or WebP. Leave blank to keep current photo."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="w-full h-[140px] bg-[#F9F9F9] border border-[#eee] rounded-[16px] flex items-center justify-center relative overflow-hidden">
                  <img
                    src={newImagePreview}
                    alt="New preview"
                    className="max-h-[120px] max-w-[90%] object-contain mix-blend-multiply"
                  />
                  <div className="absolute top-2 left-2 bg-[#1A1A1A] text-white text-[10px] px-2 py-0.5 rounded-full font-semibold font-sans">
                    New Base Photo
                  </div>
                  <button
                    onClick={handleRemoveFile}
                    className="absolute top-2 right-2 bg-white/95 hover:bg-white text-red-500 w-8 h-8 rounded-full flex items-center justify-center shadow-sm border border-[#eee] cursor-pointer transition-colors"
                    title="Remove file"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />
            </div>

            <div className="flex gap-3 mt-1">
              <button
                onClick={handleCancelConfirm}
                className="flex-1 py-3 rounded-full border border-[#ddd] text-[#333] hover:bg-[#f9f9f9] text-[14px] font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReprocess}
                disabled={!hasImages && !newImageFile}
                className="flex-1 py-3 rounded-full bg-[#1A1A1A] text-white hover:bg-black text-[14px] font-semibold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {!hasImages ? "Upload & Process" : (newImageFile ? "Upload & Process" : "Re-upload")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ── Skeleton ─────────────────────────────────────────────────────────────────
export function CatalogueCardSkeleton() {
  return (
    <div className="flex flex-col bg-white border border-[#eee] rounded-xl overflow-hidden min-h-[300px]">
      <div className="catalogue-skeleton-bg w-full aspect-square relative" />
      <div className="p-3 space-y-3">
        <div className="catalogue-skeleton-bg h-4 rounded" style={{ width: "80%" }} />
        <div className="catalogue-skeleton-bg h-3 rounded" style={{ width: "50%" }} />
        <div className="flex justify-between items-center pt-2">
          <div className="catalogue-skeleton-bg h-5 w-16 rounded-full" />
          <div className="catalogue-skeleton-bg h-3 w-8 rounded" />
        </div>
      </div>
    </div>
  );
}

// ── Product Card ──────────────────────────────────────────────────────────────
// Memoize to prevent re-renders when parent re-renders but product hasn't changed.
const CatalogueProductCard = memo(function CatalogueProductCard({ product, onClick }) {
  const router = useRouter();
  const [imgError, setImgError] = useState(false);
  const [isInStock, setIsInStock] = useState(product.stock_available ?? false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Use the best available image URL
  const imgUrl = product.showcase_image_urls?.[0] || product.generated_image_urls?.[0] || product.processed_image_url || product.image_url || product.raw_image_url;

  const title = product.title || (product.jewellery_type ? product.jewellery_type.charAt(0).toUpperCase() + product.jewellery_type.slice(1) : "Jewelry Piece");
  const weight = product.net_weight ? `${product.net_weight}g` : "";


  const handleToggle = async (e) => {
    e.stopPropagation(); // prevent card click if we add one later
    if (isUpdating) return;

    const newValue = !isInStock;
    setIsInStock(newValue); // Optimistic UI
    setIsUpdating(true);

    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ in_stock: newValue }),
      });
      if (!res.ok) {
        throw new Error("Failed to update stock");
      }
    } catch (err) {

      setIsInStock(!newValue); // Revert on failure
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <article
      onClick={() => onClick && onClick(product)}
      className="cursor-pointer group flex flex-col bg-celestique-light rounded-xl border border-[#eee] transition-all duration-200 ease shadow-[0_2px_12px_rgba(0,0,0,0.07)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-[2px] active:scale-[0.98]"
    >
      <div className="w-full aspect-square bg-[#f9f9f9] rounded-t-xl overflow-hidden relative">
        {imgUrl && !imgError ? (
          <ProtectedImage
            src={imgUrl}
            alt={title}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[#999] gap-2 bg-[#f5f5f5]">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-300" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.5 2h11l4 6-9.5 14L2.5 8l4-6z" />
            </svg>
            <span className="text-[10px] tracking-wider uppercase font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">No Image</span>
          </div>
        )}
      </div>

      <div className="border-t border-[#eee] p-3 md:p-4 flex flex-col gap-2">
        <div className="flex flex-row justify-between items-start">
          <div className="flex flex-col">
            <h3 className="font-bold text-[14px] text-[#111] leading-tight truncate">
              {title}
            </h3>
            {product.jewellery_type && (
              <span className="text-[11px] text-[#aaaaaa] mt-0.5">
                {product.jewellery_type.charAt(0).toUpperCase() + product.jewellery_type.slice(1)}
              </span>
            )}
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/dashboard/wholesaler/edit-product/${product.id}`);
            }}
            className="text-[#999] hover:text-[#111] transition-colors p-1"
            title="Edit Product"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
        </div>

        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggle}
              disabled={isUpdating}
              className={`relative w-9 h-5 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#111] ${isInStock ? 'bg-[#22c55e]' : 'bg-[#e0e0e0]'}`}
            >
              <span
                className={`absolute top-[2px] left-[2px] bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out ${isInStock ? 'translate-x-4' : 'translate-x-0'}`}
              />
            </button>
            <span className="text-[12px] text-[#999]">
              {isInStock ? "In stock" : "Out of stock"}
            </span>
          </div>
          {weight && (
            <span className="text-[12px] text-[#999]">{weight}</span>
          )}
        </div>
      </div>
    </article>
  );
});

// ── CatalogueGrid ─────────────────────────────────────────────────────────────
export default function CatalogueGrid({
  products = [],
  isLoading = false,
  isError = false,
  onRetry,
  activeCategory = "All",
  onUpdateProduct,
  wholesalerId,
  isLimitReached = false,
}) {
  const router = useRouter();
  const [selectedProduct, setSelectedProduct] = useState(null);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <p className="text-[14px] text-[#666]">Something went wrong. Please try again.</p>
        <button
          onClick={onRetry}
          className="text-[#111] text-[14px] font-medium border border-[#ddd] px-4 py-2 rounded-full hover:bg-[#f9f9f9] transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-[16px]">
        {Array.from({ length: 8 }).map((_, i) => (
          <CatalogueCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    const isFiltered = activeCategory !== "all" && activeCategory !== "All";
    const displayName = isFiltered ? activeCategory : "jewelry";

    return (
      <div className="flex flex-col items-center justify-center py-16 text-center w-full">
        <Image
          src="https://res.cloudinary.com/dcs0vuzwg/image/upload/v1775076102/image_1613_bslbzg.png"
          alt="No products"
          width={220}
          height={220}
          loading="lazy"
          className="w-[220px] h-auto mb-6"
        />
        <h3 className="font-bold text-[18px] text-[#111] mb-2">
          Nothing here yet
        </h3>
        <p className="text-[14px] text-[#666] max-w-sm mb-6">
          You haven't added any {displayName} to your catalogue. Upload your first design.
        </p>
        <button
          onClick={() => router.push("/dashboard/wholesaler/add-product")}
          className="bg-[#111] text-white text-[14px] rounded-full px-[28px] py-[12px] hover:bg-[#333] transition-colors"
        >
          Upload design
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[16px]">
        {products.map((product) => (
          <CatalogueProductCard 
            key={product.id} 
            product={product} 
            onClick={() => setSelectedProduct(product)}
          />
        ))}
      </div>
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onUpdate={(updatedProduct) => {
            setSelectedProduct(updatedProduct);
            onUpdateProduct?.(updatedProduct);
          }}
          wholesalerId={wholesalerId}
          isLimitReached={isLimitReached}
        />
      )}
    </>
  );
}
