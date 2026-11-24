"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { RetailerCatalogueGrid } from "../../../../components/retailer/RetailerCatalogueGrid";

const designsCache = {
  data: [],
  timestamp: 0
};
const CACHE_TTL_MS = 30_000;
export default function RetailerCataloguePage() {
  const [designs, setDesigns] = useState(() => designsCache.data || []);
  const [isLoading, setIsLoading] = useState(designsCache.data.length === 0);
  const [error, setError] = useState("");

  // AbortController ref for cancelling in-flight requests
  const abortRef = useRef(null);

  const fetchDesigns = useCallback(async (force = false) => {
    // Cancel any in-flight request before starting a new one
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    // Skip if recent cached data is already available.
    if (!force && designsCache.data.length > 0 && Date.now() - designsCache.timestamp < CACHE_TTL_MS) {
      setDesigns(designsCache.data);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/designs/list?archived=true`, {
        signal: controller.signal,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to load designs.");
      }

      // Update both state and module-level cache
      designsCache.data = result.data || [];
      designsCache.timestamp = Date.now();
      setDesigns(designsCache.data);
    } catch (err) {
      if (err.name === "AbortError") return; // Ignore cancelled requests
      setError(err.message || "Failed to load designs.");
      setDesigns([]);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchDesigns();
  }, [fetchDesigns]);

  const totals = useMemo(() => {
    return { total: designs.length };
  }, [designs]);

  const handleArchiveToggle = async (design) => {
    const nextValue = !design.is_archived;

    // Optimistic update against the cached array
    designsCache.data = designsCache.data.map((item) =>
      item.id === design.id ? { ...item, is_archived: nextValue } : item
    );
    designsCache.timestamp = Date.now();
    setDesigns(designsCache.data);

    const response = await fetch(`/api/designs/${design.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_archived: nextValue }),
    });

    if (!response.ok) {
      // Revert on failure
      designsCache.data = designsCache.data.map((item) =>
        item.id === design.id ? { ...item, is_archived: design.is_archived } : item
      );
      designsCache.timestamp = Date.now();
      setDesigns(designsCache.data);
    }
  };

  return (
    <div className="flex flex-col min-h-screen relative">
      <main className="flex-1 w-full max-w-[895px] px-6 lg:pl-0 lg:pr-9 pt-[27px] pb-10 flex flex-col gap-[28px]">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex flex-col gap-[4px]">
            <h1 className="text-[24px] leading-[32px] font-bold text-[#0f172b] tracking-[0.07px]">
              Catalogue ({totals.total})
            </h1>
            <p className="text-[14px] leading-[20px] font-medium text-[#62748e] tracking-[-0.15px]">
              Welcome back! look what all you have to offer
            </p>
          </div>

          <Link
            href="/dashboard/retailer/catalogue/upload"
            className="flex items-center justify-center gap-[8px] bg-[#030213] text-white rounded-[8px] px-[12px] h-[36px] mt-[11px] hover:bg-black transition-colors w-fit"
          >
            <img src="/retailer-admin/upload-white.svg" alt="" width={16} height={16} />
            <span className="text-[14px] font-medium tracking-[-0.15px]">Upload Design</span>
          </Link>
        </div>

        {/* Error display */}
        {error && (
          <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-600 font-medium flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => fetchDesigns(true)}
              className="text-[11px] font-bold text-red-700 hover:underline ml-4"
            >
              Retry
            </button>
          </div>
        )}

        {/* Design grid */}
        <RetailerCatalogueGrid
          designs={designs}
          isLoading={isLoading}
          onArchiveToggle={handleArchiveToggle}
        />

      </main>
    </div>
  );
}
