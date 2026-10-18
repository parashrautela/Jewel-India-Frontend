"use client";

import { useCallback, useState } from "react";
import { safeImageUrl } from "../../lib/wishlist/contract.mjs";

// Shared links send a card-size `image_url` (about 40 KB); store screens pass full product rows.
export function productImage(product) {
  return safeImageUrl(product.image_url ?? product.showcase_image_urls?.[0] ?? product.generated_image_urls?.[0] ?? product.processed_image_url);
}

const block = event => event.preventDefault();

function TileImage({ product }) {
  const src = productImage(product);
  const [failed, setFailed] = useState(!src);
  // A photo that failed before hydration never fires onError; a broken image is "complete" with no width.
  const checkLoaded = useCallback(el => { if (el?.complete && el.naturalWidth === 0) setFailed(true); }, []);
  // The shimmer sits behind the photo, so it shows until the image paints, with no load state to miss.
  return <div className="relative aspect-square overflow-hidden bg-stone-100">
    <div aria-hidden className="absolute inset-0 animate-pulse bg-gradient-to-br from-stone-100 via-stone-200/70 to-stone-100" />
    {failed ?
      <div className="relative flex h-full items-center justify-center bg-stone-100 px-3 text-center text-xs text-stone-500">Image unavailable</div> :
      // Catalogue images intentionally bypass the shared Next/PWA image cache.
      // eslint-disable-next-line @next/next/no-img-element
      <img ref={checkLoaded} src={src} alt={product.title || "Jewellery design"} loading="lazy" decoding="async" referrerPolicy="no-referrer"
        draggable={false} onContextMenu={block} onError={() => setFailed(true)}
        className="relative h-full w-full select-none object-cover text-transparent transition duration-500 group-hover:scale-[1.03]" />}
  </div>;
}

/**
 * The design grid used by shared links and by the store's own wishlist screens.
 * `showMeta` adds the net weight (wishlists); catalogue links show photo and name only.
 * `onOpen(index)` makes each photo open the full-screen viewer.
 */
export default function ProductTiles({ products, action, onOpen, showMeta = true }) {
  return <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
    {products.map((product, index) => <li key={product.id}>
      <article className="group h-full overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
        {onOpen ?
          <button type="button" onClick={() => onOpen(index)} className="block w-full cursor-zoom-in text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-stone-900"
            aria-label={`View ${product.title || "design"} full screen`}>
            <TileImage product={product} />
          </button> :
          <TileImage product={product} />}
        <div className="space-y-1 px-3 py-2.5 sm:px-3.5 sm:py-3">
          <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-stone-900 sm:text-sm">{product.title || product.jewellery_type || "Jewellery design"}</h3>
          {showMeta && product.net_weight != null && <p className="text-xs text-stone-500">{product.net_weight}g</p>}
          {action?.(product)}
        </div>
      </article>
    </li>)}
  </ul>;
}
