export const IMAGE_SEARCH_MODEL = 'Xenova/clip-vit-base-patch32';
// Conservative initial cosine cutoff, NOT a percentage of design accuracy.
export const IMAGE_MATCH_THRESHOLD = 0.9;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 25_000_000;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateImageFile(file) {
  if (!file || !IMAGE_TYPES.includes(file.type)) throw new Error('Choose a JPG, PNG or WebP image.');
  if (!file.size || file.size > MAX_IMAGE_BYTES) throw new Error('Choose an image smaller than 10 MB.');
}
export function normalizeVector(values) {
  const magnitude = Math.hypot(...values);
  if (!magnitude || !Number.isFinite(magnitude)) throw new Error('Could not read image features.');
  return Array.from(values, value => value / magnitude);
}
export function cosineSimilarity(left, right) {
  if (left.length !== right.length || !left.length) throw new Error('Incompatible image features.');
  return Math.max(-1, Math.min(1, left.reduce((sum, value, index) => sum + value * right[index], 0)));
}
export function filterDesigns(designs, category = '', text = '') {
  const selected = category.trim().toLowerCase().replace(/s$/, '');
  const query = text.trim().toLowerCase();
  return designs.filter(design => (!selected || (design.category || '').trim().toLowerCase().replace(/s$/, '') === selected)
    && (!query || [design.title, ...(Array.isArray(design.tags) ? design.tags : [])].filter(Boolean).join(' ').toLowerCase().includes(query)));
}
export function rankMatches(query, candidates, threshold = IMAGE_MATCH_THRESHOLD, limit = 20) {
  return candidates.map(({ id, vector }) => ({ id, score: cosineSimilarity(query, vector) }))
    .filter(match => match.score >= threshold)
    .sort((a, b) => b.score - a.score || String(a.id).localeCompare(String(b.id)))
    .slice(0, limit);
}

export function productSearchImage(product) {
  return product.showcase_image_urls?.[0] || product.generated_image_urls?.[0]
    || product.processed_image_url || product.raw_image_url || product.image_url || '';
}
export function searchableProducts(products) {
  return products.map(product => ({
    ...product,
    category: product.jewellery_type || product.category || '',
    image_url: productSearchImage(product),
    tags: [product.category, product.style, product.metal_purity].filter(Boolean),
  }));
}
