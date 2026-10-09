"use client";

import { useState, useEffect, useRef } from "react";
import { ProductDetailModal } from "./ProductDetailModal";
import ProtectedImage from "../shared/ProtectedImage";

// ── Skeleton placeholder (matches card proportions exactly) ────────────────
export function ProductCardSkeleton() {
  return (
    <article className="flex flex-col">
      {/* Image skeleton */}
      <div className="relative aspect-4/5 w-full mb-6 skeleton-shimmer" />
      {/* Title/category row skeleton */}
      <div className="flex items-center justify-between border-b border-celestique-dark/10 pb-2 mt-2 gap-4">
        <div className="h-2 w-2/3 skeleton-shimmer" />
        <div className="h-2 w-1/5 skeleton-shimmer" />
      </div>
      {/* Author skeleton */}
      <div className="h-2 w-1/3 skeleton-shimmer mt-3" />
    </article>
  );
}
// ── Main card ──────────────────────────────────────────────────────────────
export function ProductCard({ product, index = 0 }) {
  const [imgLoaded,   setImgLoaded]   = useState(false);
  const [imgError,    setImgError]    = useState(false);
  const [variantIdx,  setVariantIdx]  = useState(0);
  const [modalOpen,   setModalOpen]   = useState(false);
  const cardRef = useRef(null);

  // Respect the wholesaler's selected showcase order. For existing products
  // without that selection, show generated renders before raw/upload fallbacks.
  const variants = Array.from(new Set([
    ...(Array.isArray(product.showcase_image_urls) ? product.showcase_image_urls : []),
    ...(Array.isArray(product.generated_image_urls) ? product.generated_image_urls : []),
    product.processed_image_url,
    product.image_url,
    product.raw_image_url,
  ].filter(Boolean)));

  const hasMultiple = variants.length > 1;
  const activeUrl   = variants[variantIdx] ?? null;

  // Reset load state on variant change
  function prev(e) {
    e.preventDefault();
    setVariantIdx((i) => (i - 1 + variants.length) % variants.length);
    setImgLoaded(false);
    setImgError(false);
  }
  function next(e) {
    e.preventDefault();
    setVariantIdx((i) => (i + 1) % variants.length);
    setImgLoaded(false);
    setImgError(false);
  }

  // Intersection Observer — stagger card entrance based on index
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const delay = (index % 3) * 100; // 0 / 100 / 200ms per column
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => el.classList.add("is-visible"), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [index]);

  return (
    <>
    <article
      ref={cardRef}
      className="group flex flex-col card-enter cursor-pointer"
      onClick={() => setModalOpen(true)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setModalOpen(true); }}
      aria-label={`View details for ${product.title || product.jewellery_type || "jewellery piece"}`}
    >

      {/* ── Image container ── */}
      <div className="relative aspect-4/5 w-full overflow-hidden mb-6">

        {/* Shimmer skeleton — visible until image finishes loading */}
        {activeUrl && !imgError && !imgLoaded && (
          <div className="absolute inset-0 z-10 skeleton-shimmer" />
        )}

        {activeUrl && !imgError ? (
          <ProtectedImage
            src={activeUrl}
            alt={product.title || product.jewellery_type || "Jewellery"}
            className={`w-full h-full object-cover mix-blend-multiply transition-all duration-700 group-hover:scale-105 ${
              imgLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setImgLoaded(true)}
            onError={() => { setImgError(true); setImgLoaded(true); }}
          />
        ) : (
          // Error / no URL fallback
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-celestique-taupe/20 text-celestique-dark/25">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.5 2h11l4 6-9.5 14L2.5 8l4-6z" />
            </svg>
            <span className="text-[9px] uppercase tracking-widest font-bold">No Image</span>
          </div>
        )}

        {/* VIEW overlay — appears on hover to hint at clickability */}
        <div className="absolute inset-0 z-10 flex items-end justify-center pb-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <span className="text-[9px] uppercase tracking-[0.3em] font-bold bg-celestique-dark text-celestique-cream px-4 py-2">
            View Details
          </span>
        </div>

        {/* Stock badge — only after image loads to avoid floating on skeleton */}
        {imgLoaded && (
          <div className="absolute top-4 left-4 z-20">
            {product.stock_available ? (
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-celestique-dark bg-celestique-cream/85 backdrop-blur-md px-3 py-1.5">
                In Stock
              </span>
            ) : product.make_to_order_days ? (
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-celestique-dark bg-celestique-cream/85 backdrop-blur-md px-3 py-1.5">
                Made to Order
              </span>
            ) : null}
          </div>
        )}

        {/* Variant navigation — stop propagation so clicking arrows doesn't open modal */}
        {hasMultiple && (
          <>
            <button onClick={(e) => { e.stopPropagation(); prev(e); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-celestique-cream/80 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-celestique-cream text-celestique-dark z-20"
              aria-label="Previous variant"
            >
              &larr;
            </button>
            <button onClick={(e) => { e.stopPropagation(); next(e); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-celestique-cream/80 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-celestique-cream text-celestique-dark z-20"
              aria-label="Next variant"
            >
              &rarr;
            </button>
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {variants.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); setVariantIdx(i); setImgLoaded(false); setImgError(false); }}
                  className={`w-1.5 h-1.5 transition-colors ${
                    i === variantIdx ? "bg-celestique-dark" : "bg-celestique-dark/30 hover:bg-celestique-dark/60"
                  }`}
                  aria-label={`View variant ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Text meta ── */}
      <div className="flex items-center justify-between border-b border-celestique-dark/10 pb-2 mt-2">
        <h3 className="font-sans text-[10px] uppercase tracking-widest font-bold text-celestique-dark line-clamp-1">
          {product.title ||
            `${
              product.jewellery_type
                ? product.jewellery_type.charAt(0).toUpperCase() + product.jewellery_type.slice(1)
                : "Jewellery"
            } Piece`}
        </h3>
        <div className="text-[10px] uppercase tracking-widest text-celestique-dark/50 shrink-0 ml-2">
          {product.category || ""}
        </div>
      </div>

      {product.wholesaler_email && (
        <p className="text-[9px] tracking-widest uppercase text-celestique-dark/35 mt-2">
          By {product.wholesaler_email.split("@")[0]}
        </p>
      )}
    </article>

    {modalOpen && (
      <ProductDetailModal product={product} onClose={() => setModalOpen(false)} />
    )}
    </>
  );
}
