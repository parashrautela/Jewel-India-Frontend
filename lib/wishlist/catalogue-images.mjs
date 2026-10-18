import { safeImageUrl } from './contract.mjs';

// A chosen showcase is the published gallery; unused source photos stay private.
export function catalogueImages(product) {
  const showcase = Array.isArray(product.showcase_image_urls) ? product.showcase_image_urls : [];
  const sources = showcase.length ? showcase : [
    ...(Array.isArray(product.generated_image_urls) ? product.generated_image_urls : []),
    product.processed_image_url, product.image_url,
    ...(Array.isArray(product.custom_image_urls) ? product.custom_image_urls : []),
    product.raw_image_url,
  ];
  return [...new Set(sources.map(safeImageUrl).filter(Boolean))].map(original => {
    const variants = product.image_variants?.[original];
    return {
      image_url: safeImageUrl(variants?.card) ?? original,
      full_image_url: safeImageUrl(variants?.detail) ?? safeImageUrl(variants?.full) ?? original,
    };
  });
}

export function cataloguePhotos(products) {
  return products.flatMap(product => {
    // Older servers and previously loaded pages may have only the cover image.
    const images = Array.isArray(product.images) && product.images.length ? product.images : [product];
    return images.map((image, index) => ({
      ...product, id: `${product.id}:${index}`,
      image_url: safeImageUrl(image.image_url),
      full_image_url: safeImageUrl(image.full_image_url) ?? safeImageUrl(image.image_url),
    }));
  });
}
