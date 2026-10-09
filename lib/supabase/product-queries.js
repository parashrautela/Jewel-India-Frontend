import { createClient } from "./client";

/** Store an original product photo for a draft without invoking the paid AI pipeline. */
export async function uploadProductDraftImage(file, expectedUserId) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Your session has expired. Please sign in again to continue.");
  }
  if (expectedUserId && user.id !== expectedUserId) {
    throw new Error("User authorization mismatch. Please sign in again.");
  }

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `raw/${user.id}/product-draft_${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("plant-images").upload(path, file, {
    cacheControl: "3600",
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error(error.message || "Failed to save the product photo.");

  return supabase.storage.from("plant-images").getPublicUrl(path).data.publicUrl;
}
