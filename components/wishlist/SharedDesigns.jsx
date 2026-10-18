"use client";

import { useCallback, useState } from "react";
import ProductTiles from "./ProductTiles";
import DesignViewer from "./DesignViewer";

const clock = seconds => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/**
 * What a guest sees once a shared link is open: who shared it, the title as an
 * editorial headline, the design count and remaining session time, a full-bleed
 * grid, and a full-screen viewer. Layout: plans/catalogue-sharing/evidence/web/DESIGN-SPEC.md.
 * Catalogue links show photo and name only (plans/catalogue-sharing, P2).
 */
export default function SharedDesigns({ view, seconds, sender }) {
  const [open, setOpen] = useState(null);
  const close = useCallback(() => setOpen(null), []);
  const products = view.products ?? [];
  const isCatalogue = view.kind === "catalogue";
  const urgent = seconds > 0 && seconds <= 120;

  return <>
    <header className="px-2.5 pb-6 pt-10 sm:px-6 sm:pb-10 sm:pt-16">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#6B6B6B]">Shared by {view.store_name || sender}</p>
      <h1 className="mt-3 max-w-5xl break-words text-[40px] leading-[0.9] tracking-[-0.02em] sm:text-[56px] lg:text-[72px]">{view.title}</h1>
    </header>
    <div className="flex items-center justify-between border-y border-[#F2F2F2] px-2.5 py-2 font-mono text-[10px] uppercase tracking-[0.12em] sm:px-6">
      <span>{products.length} {products.length === 1 ? "design" : "designs"}</span>
      <span role="timer" aria-live="off" className={`tabular-nums ${urgent ? "text-[#B45309]" : ""}`}>
        {urgent && <span aria-hidden className="mr-1.5 inline-block h-1.5 w-1.5 -translate-y-px animate-pulse rounded-full bg-[#B45309]" />}
        Session {clock(seconds)}
      </span>
    </div>
    <ProductTiles products={products} showMeta={!isCatalogue} onOpen={setOpen} variant="editorial" />
    {open != null && <DesignViewer products={products} index={open} onIndexChange={setOpen} onClose={close} />}
  </>;
}
