"use client";

import { useState, useEffect, useCallback } from "react";
import ProtectedImage from "../shared/ProtectedImage";

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (val, suffix = "") =>
  val !== null && val !== undefined && val !== "" ? `${val}${suffix}` : null;

const fmtDate = (iso) => {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const checkerStyle = {
  backgroundImage: `
    linear-gradient(45deg, #e0dbd2 25%, transparent 25%),
    linear-gradient(-45deg, #e0dbd2 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e0dbd2 75%),
    linear-gradient(-45deg, transparent 75%, #e0dbd2 75%)
  `,
  backgroundSize: "20px 20px",
  backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
  backgroundColor: "#f5f2eb",
};

// ── Spec Row ─────────────────────────────────────────────────────────────────
function SpecRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between py-3 border-b border-celestique-dark/8 gap-4">
      <span className="text-[9px] uppercase tracking-[0.25em] font-bold text-celestique-dark/40 shrink-0">
        {label}
      </span>
      <span className="text-[11px] uppercase tracking-[0.12em] font-medium text-celestique-dark text-right">
        {value}
      </span>
    </div>
  );
}

// ── Tag ──────────────────────────────────────────────────────────────────────
function Tag({ children }) {
  if (!children) return null;
  return (
    <span className="text-[9px] uppercase tracking-[0.2em] font-bold px-3 py-1.5 border border-celestique-dark/15 text-celestique-dark/60">
      {children}
    </span>
  );
}

// ── Main Modal ───────────────────────────────────────────────────────────────
export function ProductDetailModal({ product, onClose }) {
  const [imgIdx, setImgIdx] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Follow the wholesaler's selected showcase order, then generated renders,
  // then safe legacy fallbacks. Keep each image once.
  const images = Array.from(new Set([
    ...(Array.isArray(product.showcase_image_urls) ? product.showcase_image_urls : []),
    ...(Array.isArray(product.generated_image_urls) ? product.generated_image_urls : []),
    product.processed_image_url,
    product.image_url,
    product.raw_image_url,
  ].filter(Boolean)));

  const activeImg = images[imgIdx] ?? null;
  const hasMultiple = images.length > 1;

  // Escape to close
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const prevImg = useCallback((e) => {
    e.stopPropagation();
    setImgIdx((i) => (i - 1 + images.length) % images.length);
    setImgLoaded(false);
  }, [images.length]);

  const nextImg = useCallback((e) => {
    e.stopPropagation();
    setImgIdx((i) => (i + 1) % images.length);
    setImgLoaded(false);
  }, [images.length]);

  // ── Resolved display values ──────────────────────────────────────────────
  const displayTitle =
    product.title ||
    (product.jewellery_type
      ? product.jewellery_type.charAt(0).toUpperCase() + product.jewellery_type.slice(1)
      : "Jewellery Piece");

  const craftedBy = product.wholesaler_email
    ? product.wholesaler_email.split("@")[0].replace(/[._-]/g, " ")
    : null;

  const availability = product.stock_available
    ? "In Stock"
    : product.make_to_order_days
    ? `Made to Order — ${product.make_to_order_days} days`
    : "Limited Availability";

  const totalWeight = product.net_weight ? `${product.net_weight}g net` : null;

  return (
    /* ── Backdrop ── */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
      style={{ backgroundColor: "rgba(17,17,17,0.75)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      {/* ── Panel ── */}
      <div
        className="relative w-full max-w-5xl max-h-[92vh] bg-celestique-cream flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden"
        style={{ animation: "fadeInUp 0.3s ease both" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Close button ── */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 z-20 w-9 h-9 flex items-center justify-center bg-celestique-cream/90 backdrop-blur-md border border-celestique-dark/10 text-celestique-dark hover:bg-celestique-dark hover:text-celestique-cream transition-all duration-200"
          aria-label="Close"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        {/* ═══════════════ LEFT — Image Canvas ═══════════════════════════════ */}
        <div className="w-full lg:w-[52%] shrink-0 relative flex flex-col">
          {/* Main image */}
          <div className="relative flex-1 min-h-[300px] lg:min-h-0" style={checkerStyle}>
            {activeImg ? (
              <>
                {/* Shimmer */}
                {!imgLoaded && (
                  <div className="absolute inset-0 z-10 skeleton-shimmer" />
                )}
                <ProtectedImage
                  key={activeImg}
                  src={activeImg}
                  alt={displayTitle}
                  className={`w-full h-full object-contain transition-opacity duration-500 ${
                    imgLoaded ? "opacity-100" : "opacity-0"
                  }`}
                  style={{ maxHeight: "calc(92vh - 80px)" }}
                  onLoad={() => setImgLoaded(true)}
                  onError={() => setImgLoaded(true)}
                />
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-celestique-dark/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.5 2h11l4 6-9.5 14L2.5 8l4-6z" />
                </svg>
                <span className="text-[9px] uppercase tracking-widest font-bold">No Image</span>
              </div>
            )}

            {/* Variant nav arrows */}
            {hasMultiple && (
              <>
                <button
                  onClick={prevImg}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-celestique-cream/85 backdrop-blur-md flex items-center justify-center hover:bg-celestique-cream border border-celestique-dark/10 text-celestique-dark transition-all"
                  aria-label="Previous image"
                >&larr;</button>
                <button
                  onClick={nextImg}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-celestique-cream/85 backdrop-blur-md flex items-center justify-center hover:bg-celestique-cream border border-celestique-dark/10 text-celestique-dark transition-all"
                  aria-label="Next image"
                >&rarr;</button>
              </>
            )}

            {/* Availability badge */}
            <div className="absolute top-4 left-4 z-10">
              <span
                className={`text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 ${
                  product.stock_available
                    ? "bg-celestique-dark text-celestique-cream"
                    : "bg-celestique-cream/85 border border-celestique-dark/20 text-celestique-dark"
                }`}
              >
                {product.stock_available ? "In Stock" : product.make_to_order_days ? "Made to Order" : ""}
              </span>
            </div>
          </div>

          {/* Thumbnail strip */}
          {hasMultiple && (
            <div className="flex gap-2 p-4 bg-celestique-taupe/20 border-t border-celestique-dark/8 overflow-x-auto">
              {images.map((url, i) => (
                <button
                  key={i}
                  onClick={() => { setImgIdx(i); setImgLoaded(false); }}
                  className={`shrink-0 w-14 h-14 overflow-hidden border-2 transition-all ${
                    i === imgIdx
                      ? "border-celestique-dark"
                      : "border-transparent opacity-50 hover:opacity-80"
                  }`}
                >
                  <ProtectedImage src={url} alt={`Variant ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ═══════════════ RIGHT — Details Panel ═════════════════════════════ */}
        <div className="flex-1 lg:overflow-y-auto flex flex-col">
          {/* Top stripe */}
          <div className="px-8 pt-8 pb-6 border-b border-celestique-dark/10">
            <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-celestique-dark/30 block mb-4">
              / STUDIO CELESTIQUE
            </span>
            <h2 className="font-serif text-3xl md:text-4xl tracking-tight text-celestique-dark leading-tight italic mb-4">
              {displayTitle}
            </h2>
            {/* Type + Category + Style tags */}
            <div className="flex flex-wrap gap-2">
              {product.jewellery_type && <Tag>{product.jewellery_type}</Tag>}
              {product.category && <Tag>{product.category}</Tag>}
              {product.style && <Tag>{product.style}</Tag>}
            </div>
          </div>

          {/* Spec sheet */}
          <div className="px-8 py-6 flex-1">
            <p className="text-[9px] uppercase tracking-[0.25em] font-bold text-celestique-dark/30 mb-2">
              SPECIFICATIONS
            </p>

            <div className="divide-y divide-celestique-dark/0">
              <SpecRow label="Availability"   value={availability} />
              {product.make_to_order_days && !product.stock_available && (
                <SpecRow label="Lead Time"    value={`${product.make_to_order_days} working days`} />
              )}
              <SpecRow label="Size"           value={fmt(product.size)} />
              <SpecRow label="Metal Purity"   value={fmt(product.metal_purity)} />
              <SpecRow label="Net Weight"     value={fmt(product.net_weight, "g")} />
              <SpecRow label="Gross Weight"   value={fmt(product.gross_weight, "g")} />
              <SpecRow label="Stone Weight"   value={fmt(product.stone_weight, "g")} />
            </div>

            {/* Origin */}
            {craftedBy && (
              <div className="mt-8 pt-6 border-t border-celestique-dark/10">
                <p className="text-[9px] uppercase tracking-[0.25em] font-bold text-celestique-dark/30 mb-1">
                  CRAFTED BY
                </p>
                <p className="text-sm font-serif italic text-celestique-dark capitalize">
                  {craftedBy}
                </p>
              </div>
            )}

            {/* Date */}
            {product.created_at && (
              <div className="mt-6">
                <p className="text-[9px] uppercase tracking-[0.25em] font-bold text-celestique-dark/30 mb-1">
                  ADDED ON
                </p>
                <p className="text-[11px] uppercase tracking-widest text-celestique-dark/60">
                  {fmtDate(product.created_at)}
                </p>
              </div>
            )}
          </div>

          {/* CTA footer */}
          <div className="px-8 py-6 border-t border-celestique-dark/10 bg-celestique-taupe/10">
            <p className="text-[9px] uppercase tracking-[0.2em] text-celestique-dark/40 mb-4 leading-relaxed">
              For enquiries, styling advice, or bespoke requests, reach our atelier directly.
            </p>
            <div className="flex gap-4">
              <a
                href={`mailto:${product.wholesaler_email || "studio@celestique.com"}?subject=Enquiry: ${encodeURIComponent(displayTitle)}`}
                className="flex-1 h-12 flex items-center justify-center bg-celestique-dark text-celestique-cream text-[9px] uppercase tracking-[0.25em] font-bold hover:bg-celestique-dark/80 transition-colors"
              >
                Enquire
              </a>
              {activeImg && (
                <a
                  href={activeImg}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-12 w-12 flex items-center justify-center border border-celestique-dark/20 text-celestique-dark hover:bg-celestique-dark hover:text-celestique-cream transition-colors"
                  aria-label="Download image"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
