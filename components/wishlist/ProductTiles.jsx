"use client";

import { useCallback, useState } from "react";
import { safeImageUrl } from "../../lib/wishlist/contract.mjs";

// Shared links send a card-size `image_url` (about 40 KB); store screens pass full product rows.
export function productImage(product) {
  return safeImageUrl(product.image_url ?? product.showcase_image_urls?.[0] ?? product.generated_image_urls?.[0] ?? product.processed_image_url);
}

const block = event => event.preventDefault();

// Shared links follow plans/catalogue-sharing/evidence/web/DESIGN-SPEC.md (an Acne Studios-style grid);
// the store's own wishlist screens keep their card look.
const LOOK = {
  editorial: {
    // Gutters keep neighbouring dark studio photos from merging into one block.
    list: "grid grid-cols-2 gap-x-2 gap-y-5 px-2.5 pt-2.5 sm:gap-x-3 sm:gap-y-7 sm:px-6 sm:pt-4 pb-10 md:grid-cols-3 lg:gap-x-4 xl:grid-cols-4",
    tile: "group h-full bg-white",
    image: "bg-[#F7F7F7]",
    info: "pt-2",
    title: "line-clamp-2 font-switzer text-xs uppercase leading-5 tracking-[0.3px] text-black",
    meta: "font-switzer text-xs leading-5 text-[#6B6B6B]",
  },
  card: {
    list: "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4",
    tile: "group h-full overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04)]",
    image: "bg-stone-100",
    info: "space-y-1 px-3 py-2.5 sm:px-3.5 sm:py-3",
    title: "line-clamp-2 text-[13px] font-semibold leading-snug text-stone-900 sm:text-sm",
    meta: "text-xs text-stone-500",
  },
};

function TileImage({ product, background }) {
  const src = productImage(product);
  const [failed, setFailed] = useState(!src);
  // A photo that failed before hydration never fires onError; a broken image is "complete" with no width.
  const checkLoaded = useCallback(el => { if (el?.complete && el.naturalWidth === 0) setFailed(true); }, []);
  // The shimmer sits behind the photo, so it shows until the image paints, with no load state to miss.
  return <div className={`relative aspect-square overflow-hidden ${background}`}>
    <div aria-hidden className="absolute inset-0 animate-pulse bg-gradient-to-br from-transparent via-black/[0.03] to-transparent" />
    {failed ?
      <div className={`relative flex h-full items-center justify-center px-3 text-center text-xs text-stone-500 ${background}`}>Image unavailable</div> :
      // Catalogue images intentionally bypass the shared Next/PWA image cache.
      // eslint-disable-next-line @next/next/no-img-element
      <img ref={checkLoaded} src={src} alt={product.title || "Jewellery design"} loading="lazy" decoding="async" referrerPolicy="no-referrer"
        draggable={false} onContextMenu={block} onError={() => setFailed(true)}
        className="relative h-full w-full select-none object-cover text-transparent transition duration-700 ease-out group-hover:scale-[1.02]" />}
  </div>;
}

/**
 * The design grid used by shared links (`variant="editorial"`) and by the store's own wishlist screens.
 * `showMeta` adds the net weight (wishlists); catalogue links show photo and name only.
 * `onOpen(index)` makes each photo open the full-screen viewer.
 */
export default function ProductTiles({ products, action, onOpen, showMeta = true, variant = "card" }) {
  const look = LOOK[variant] ?? LOOK.card;
  return <ul className={look.list}>
    {products.map((product, index) => <li key={product.id}>
      <article className={look.tile}>
        {onOpen ?
          <button type="button" onClick={() => onOpen(index)} className="block w-full cursor-zoom-in text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-black"
            aria-label={`View ${product.title || "design"} full screen`}>
            <TileImage product={product} background={look.image} />
          </button> :
          <TileImage product={product} background={look.image} />}
        <div className={look.info}>
          <h3 className={look.title}>{product.title || product.jewellery_type || "Jewellery design"}</h3>
          {showMeta && product.net_weight != null && <p className={look.meta}>{product.net_weight}g</p>}
          {action?.(product)}
        </div>
      </article>
    </li>)}
  </ul>;
}
