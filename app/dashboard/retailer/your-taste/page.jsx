import { redirect } from "next/navigation";
import YourTasteClient from "../../../../components/retailer/YourTasteClient";
import { getAuthUser } from "../../../../lib/supabase/queries";
import { getRetailerYourTasteData } from "../../../../lib/cache/retailerEmployee";

export const metadata = {
  title: "Your Taste | Retailer Dashboard",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function YourTastePage() {
  const user = await getAuthUser();

  if (!user) redirect("/entry_page/signin");
  if (user.user_metadata?.role !== "retailer") redirect("/entry_page/signin");

  const pageData = await getRetailerYourTasteData(user.id);
  if (!pageData) redirect("/entry_page/signin");

  return (
    <YourTasteClient
      key={user.id}
      products={pageData.products} 
      selectedProductIds={pageData.selectedProductIds}
      categoryTabs={pageData.categoryTabs}
    />
  );
}
