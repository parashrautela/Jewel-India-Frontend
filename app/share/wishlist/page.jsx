import SharedWishlist from "../../../components/wishlist/SharedWishlist";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "A wishlist for you | Jewel India",
  description: "Open a wishlist shared by your jewellery store.",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};
export default function SharedWishlistPage() { return <SharedWishlist />; }
