import SharedWishlist from "../../../components/wishlist/SharedWishlist";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Designs for you | Jewel India",
  description: "Open designs shared by your jeweller.",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};
export default function SharedCataloguePage() { return <SharedWishlist kind="catalogue" />; }
