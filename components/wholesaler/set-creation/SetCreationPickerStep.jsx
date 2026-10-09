"use client";

import { useMemo, useRef, useState } from "react";
import { normalizeChainType } from "../../../lib/config/jewelleryTypes.mjs";
import { productImageUrl } from "../../../lib/supabase/set-creation-queries";

/**
 * Step 1 — choose the two pieces.
 *
 * Deliberately does NOT require the two pieces to match or to be different
 * categories. Pairing a plain modern necklace with a heavy temple jhumka is a
 * commercial decision the wholesaler is allowed to make; the pipeline
 * reproduces both exactly either way.
 */
export default function SetCreationPickerStep({ flow }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const fileRef1 = useRef(null);
  const fileRef2 = useRef(null);

  const categories = useMemo(() => {
    const set = new Set();
    flow.catalogProducts.forEach((p) => {
      const c = normalizeChainType(p.jewellery_type || p.category);
      if (c) set.add(c);
    });
    return ["all", ...Array.from(set).sort()];
  }, [flow.catalogProducts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return flow.catalogProducts.filter((p) => {
      const c = normalizeChainType(p.jewellery_type || p.category);
      if (category !== "all" && c !== category) return false;
      if (!q) return true;
      return (p.title || "").toLowerCase().includes(q) || (c || "").toLowerCase().includes(q);
    });
  }, [flow.catalogProducts, search, category]);

  const slotIds = [flow.selectedPiece1?.productId, flow.selectedPiece2?.productId].filter(Boolean);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
      <div className="mb-6">
        <h1 className="font-cirka text-2xl md:text-3xl font-bold text-celestique-dark">
          Create a Jewellery Set
        </h1>
        <p className="text-sm text-celestique-dark/60 mt-1">
          Pick any two pieces — a necklace and a jhumka, for example. Both are
          reproduced exactly as they are and staged together as one set photo.
        </p>
      </div>

      {/* Selected slots */}
      <div className="grid grid-cols-2 gap-3 md:gap-5 mb-6">
        {[1, 2].map((slot) => {
          const piece = slot === 1 ? flow.selectedPiece1 : flow.selectedPiece2;
          const ref = slot === 1 ? fileRef1 : fileRef2;
          return (
            <div key={slot} className="relative">
              <div
                className={`aspect-square rounded-2xl border-2 overflow-hidden flex items-center justify-center transition-all ${
                  piece
                    ? "border-celestique-dark bg-white"
                    : "border-dashed border-celestique-taupe bg-celestique-cream/40"
                }`}
              >
                {piece ? (
                  <img
                    src={piece.imageUrl}
                    alt={piece.label}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center px-3">
                    <div className="text-2xl mb-1">{slot === 1 ? "📿" : "👂"}</div>
                    <p className="text-xs font-semibold text-celestique-dark/70">
                      Piece {slot}
                    </p>
                    <p className="text-[11px] text-celestique-dark/45 mt-0.5">
                      Tap a catalogue item below, or upload
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-2 gap-2">
                <span className="text-[11px] font-semibold text-celestique-dark/70 truncate">
                  {piece ? piece.label : `Piece ${slot} — empty`}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => ref.current?.click()}
                    className="text-[11px] font-semibold px-2 py-1 rounded-md border border-celestique-taupe hover:bg-celestique-cream transition-colors"
                  >
                    Upload
                  </button>
                  {piece && (
                    <button
                      type="button"
                      onClick={() => flow.clearSlot(slot)}
                      className="text-[11px] font-semibold px-2 py-1 rounded-md border border-celestique-taupe hover:bg-celestique-cream transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <input
                ref={ref}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  flow.setCustomFile(e.target.files?.[0], slot);
                  e.target.value = "";
                }}
              />
            </div>
          );
        })}
      </div>

      {flow.uploadError && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
          {flow.uploadError}
        </div>
      )}

      {/* Catalogue */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your catalogue…"
          className="flex-1 px-3 py-2 rounded-lg border border-celestique-taupe text-sm focus:outline-none focus:ring-2 focus:ring-celestique-dark/20"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 rounded-lg border border-celestique-taupe text-sm bg-white"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === "all" ? "All categories" : c}
            </option>
          ))}
        </select>
      </div>

      {flow.isLoadingProducts ? (
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-celestique-cream animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-celestique-taupe rounded-xl">
          <p className="text-sm font-semibold text-celestique-dark/70">
            No published products yet
          </p>
          <p className="text-xs text-celestique-dark/45 mt-1">
            Upload your own photos above to build a set.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {filtered.map((p) => {
            const url = productImageUrl(p);
            const selected = slotIds.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => flow.pickProduct(p)}
                className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                  selected
                    ? "border-celestique-dark ring-2 ring-celestique-dark/20"
                    : "border-transparent hover:border-celestique-taupe"
                }`}
              >
                {url ? (
                  <img src={url} alt={p.title || ""} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-celestique-cream" />
                )}
                {selected && (
                  <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-celestique-dark text-white text-[11px] font-bold flex items-center justify-center">
                    {flow.selectedPiece1?.productId === p.id ? "1" : "2"}
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent text-white text-[10px] font-semibold px-2 py-1 text-left truncate">
                  {p.title || p.jewellery_type || "Untitled"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Continue */}
      <div className="sticky bottom-0 mt-8 -mx-4 md:-mx-8 px-4 md:px-8 py-3 bg-white/90 backdrop-blur border-t border-celestique-taupe flex items-center justify-between gap-3">
        <p className="text-xs text-celestique-dark/60">
          {flow.canProceed
            ? "Both pieces chosen"
            : "Choose two pieces to continue"}
        </p>
        <button
          type="button"
          disabled={!flow.canProceed}
          onClick={() => flow.setStep("styling")}
          className="px-5 py-2.5 rounded-lg bg-celestique-dark text-white text-sm font-bold disabled:opacity-35 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          Choose backdrop →
        </button>
      </div>
    </div>
  );
}
