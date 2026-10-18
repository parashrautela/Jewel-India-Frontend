import "server-only";
import { supabaseAdmin } from "../supabase/admin.js";
import { catalogueImages } from "./catalogue-images.mjs";

// Called only after the capability RPC has admitted this session and selected its designs.
export async function withCatalogueImages(result) {
  if (!result?.ok || result.kind !== "catalogue") return result;
  const products = result.products ?? [];
  if (!products.length) return { ok: false, error: "UNAVAILABLE" };
  const { data, error } = await supabaseAdmin.from("products")
    .select("id,showcase_image_urls,generated_image_urls,processed_image_url,image_url,custom_image_urls,raw_image_url,image_variants")
    .in("id", products.map(product => product.id))
    .eq("is_published", true);
  if (error) throw new Error("WISHLIST_UNAVAILABLE");
  const rows = new Map(data.map(product => [product.id, product]));
  const shared = products.filter(product => rows.has(product.id)).map(product => ({
    ...product, images: catalogueImages(rows.get(product.id)),
  }));
  return shared.length ? { ...result, products: shared } : { ok: false, error: "UNAVAILABLE" };
}
