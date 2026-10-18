"use client";

import { useCallback, useState } from "react";
import ProductTiles from "./ProductTiles";
import DesignViewer from "./DesignViewer";

const clock = seconds => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/**
 * What a guest sees once a shared link is open: who shared it, the title,
 * the remaining session time, the designs, and a full-screen viewer.
 * Catalogue links show photo and name only (plans/catalogue-sharing, P2).
 */
export default function SharedDesigns({ view, seconds, sender }) {
  const [open, setOpen] = useState(null);
  const close = useCallback(() => setOpen(null), []);
  const products = view.products ?? [];
  const isCatalogue = view.kind === "catalogue";
  const urgent = seconds > 0 && seconds <= 120;

  return <>
    <header className="mt-5 mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm text-stone-500">Shared by <span className="font-medium text-stone-700">{view.store_name || sender}</span></p>
        <h1 className="mt-1.5 text-2xl font-semibold leading-tight text-stone-900 sm:text-3xl">{view.title}</h1>
        <p className="mt-1.5 text-sm text-stone-500">{products.length} {products.length === 1 ? "design" : "designs"}</p>
      </div>
      <p role="timer" aria-live="off"
        className={`inline-flex w-fit items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm tabular-nums ${urgent ? "border-amber-300 bg-amber-50 text-amber-900" : "border-stone-200 bg-white text-stone-600"}`}>
        <span aria-hidden className={`h-2 w-2 rounded-full ${urgent ? "bg-amber-500" : "bg-emerald-500"}`} />
        Session ends in {clock(seconds)}
      </p>
    </header>
    <ProductTiles products={products} showMeta={!isCatalogue} onOpen={setOpen} />
    {open != null && <DesignViewer products={products} index={open} onIndexChange={setOpen} onClose={close} />}
  </>;
}
