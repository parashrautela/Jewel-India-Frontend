"use client";

import { useState } from "react";
import ProtectedImage from "../shared/ProtectedImage";
function UploadCard({ product }) {
  const [imgError, setImgError] = useState(false);
  const [variantIdx, setVariantIdx] = useState(0);

  const variants = Array.from(new Set([
    ...(Array.isArray(product.showcase_image_urls) ? product.showcase_image_urls : []),
    ...(Array.isArray(product.generated_image_urls) ? product.generated_image_urls : []),
    product.processed_image_url,
    product.image_url,
    product.raw_image_url,
  ].filter(Boolean)));

  const hasMultiple = variants.length > 1;
  const activeUrl = variants[variantIdx] ?? null;

  const uploadedAt = product.created_at
    ? new Date(product.created_at).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <article className="group flex flex-col">
      {/* ── Image ── */}
      <div className="relative aspect-4/5 w-full overflow-hidden bg-celestique-taupe/20 mb-5">
        {activeUrl && !imgError ? (
          <ProtectedImage
            src={activeUrl}
            alt={product.title || product.jewellery_type || "Jewellery"}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-celestique-dark/30">
            <span className="font-serif text-lg">No Image</span>
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-4 left-4">
          {product.stock_available ? (
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-celestique-dark bg-celestique-cream/90 backdrop-blur-md px-3 py-1.5">
              Live
            </span>
          ) : product.make_to_order_days ? (
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-celestique-dark bg-celestique-cream/90 backdrop-blur-md px-3 py-1.5">
              Made to Order
            </span>
          ) : null}
        </div>

        {/* Variant carousel */}
        {hasMultiple && (
          <>
            <button
              onClick={() => { setVariantIdx((i) => (i - 1 + variants.length) % variants.length); setImgError(false); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-celestique-cream/80 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-celestique-dark"
              aria-label="Previous"
            >
              &larr;
            </button>
            <button
              onClick={() => { setVariantIdx((i) => (i + 1) % variants.length); setImgError(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-celestique-cream/80 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-celestique-dark"
              aria-label="Next"
            >
              &rarr;
            </button>
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {variants.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setVariantIdx(i); setImgError(false); }}
                  className={`w-1.5 h-1.5 transition-colors ${
                    i === variantIdx ? "bg-celestique-dark" : "bg-celestique-dark/30"
                  }`}
                  aria-label={`Variant ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}

        {/* Variant count chip */}
        {hasMultiple && (
          <div className="absolute bottom-4 right-4 bg-celestique-dark text-celestique-cream text-[8px] uppercase tracking-widest px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {variantIdx + 1} / {variants.length}
          </div>
        )}
      </div>

      {/* ── Meta ── */}
      <div className="space-y-1 border-b border-celestique-dark/10 pb-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-sans text-[11px] uppercase tracking-[0.12em] font-bold text-celestique-dark leading-tight line-clamp-1">
            {product.title ||
              `${
                product.jewellery_type
                  ? product.jewellery_type.charAt(0).toUpperCase() +
                    product.jewellery_type.slice(1)
                  : "Jewellery"
              } Piece`}
          </h3>
          {product.category && (
            <span className="text-[9px] uppercase tracking-widest text-celestique-dark/40 shrink-0">
              {product.category}
            </span>
          )}
        </div>
        {product.metal_purity && (
          <p className="text-[9px] uppercase tracking-widest text-celestique-dark/50">
            {product.metal_purity}
            {product.net_weight ? ` · ${product.net_weight}g net` : ""}
          </p>
        )}
        {uploadedAt && (
          <p className="text-[9px] uppercase tracking-widest text-celestique-dark/30">
            Uploaded {uploadedAt}
          </p>
        )}
      </div>
    </article>
  );
}

export function WholesalerUploads({ products, email }) {
  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-16">

      {/* ── Hero bar ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 pb-16 border-b border-celestique-dark/10 mb-16">
        <div className="space-y-4">
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-celestique-dark/40">
            / YOUR PORTFOLIO
          </span>
          <h1 className="font-serif text-5xl md:text-7xl tracking-tighter text-celestique-dark uppercase leading-none">
            My Uploads
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-celestique-dark/50 font-medium">
            {email}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <span className="font-serif text-4xl text-celestique-dark">
            {products.length}
          </span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-celestique-dark/40 font-bold">
            pieces uploaded
          </span>
        </div>
      </div>

      {/* ── Grid ── */}
      {products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16">
          {products.map((product) => (
            <UploadCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-40 text-center border border-dashed border-celestique-dark/15">
          <div className="w-16 h-16 border border-celestique-dark/20 flex items-center justify-center mb-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-celestique-dark/30" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.5 2h11l4 6-9.5 14L2.5 8l4-6z" />
            </svg>
          </div>
          <h2 className="font-serif text-2xl text-celestique-dark/40 mb-3">
            No pieces yet
          </h2>
          <p className="text-[10px] uppercase tracking-[0.2em] text-celestique-dark/30 max-w-xs leading-loose">
            Your uploaded jewelry will appear here once your first piece is processed.
          </p>
        </div>
      )}
    </div>
  );
}
