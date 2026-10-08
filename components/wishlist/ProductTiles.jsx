import { safeImageUrl } from "../../lib/wishlist/contract.mjs";

export function productImage(product) {
  return safeImageUrl(product.image_url ?? product.showcase_image_urls?.[0] ?? product.generated_image_urls?.[0] ?? product.processed_image_url);
}

export default function ProductTiles({ products, action }) {
  return <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
    {products.map(product => <article key={product.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div className="aspect-square bg-stone-100">
        {productImage(product) ?
          // Public catalogue images intentionally bypass the shared Next/PWA image cache.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={productImage(product)} alt={product.title || "Jewellery design"} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-contain" /> :
          <div className="flex h-full items-center justify-center text-sm text-stone-500">Image unavailable</div>}
      </div>
      <div className="space-y-2 p-3">
        <h3 className="text-sm font-semibold text-stone-900">{product.title || product.jewellery_type || "Jewellery design"}</h3>
        {product.net_weight != null && <p className="text-xs text-stone-500">{product.net_weight}g</p>}
        {action?.(product)}
      </div>
    </article>)}
  </div>;
}
