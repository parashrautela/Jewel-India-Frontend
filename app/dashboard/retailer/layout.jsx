import { getAuthUser } from "../../../lib/supabase/queries";
import { getRetailerSidebarProfile } from "../../../lib/cache/retailerEmployee";
import RetailerSidebar from "../../../components/retailer/RetailerSidebar";
import { Suspense } from "react";
import { CreditsProvider } from "../../../context/CreditsContext";
import dynamic from "next/dynamic";

// Lazy-load AddEmployeeModal — only loaded when ?modal=add-employee is set.
// Reduces initial JS bundle for every retailer route.
const AddEmployeeModal = dynamic(
  () => import("../../../components/retailer/AddEmployeeModal"),
  { loading: () => null }
);

export const metadata = {
  title: "Retailer Dashboard",
  description: "Manage your store and employees.",
};

export default async function RetailerLayout({ children }) {
  const user = await getAuthUser();

  let retailerData = null;
  if (user) {
    retailerData = await getRetailerSidebarProfile(user.id);
  }

  return (
    <CreditsProvider><div className="theme-retailer flex min-h-screen bg-[#F0F2F5]">
      <RetailerSidebar retailer={retailerData} />
      <main className="flex-1 min-w-0 ml-0 lg:ml-[200px] pt-0 md:pt-[60px] lg:pt-0 pb-[92px] md:pb-0 min-h-screen flex flex-col transition-all duration-300">
        {children}
      </main>
      
      <Suspense fallback={null}>
        <AddEmployeeModal />
      </Suspense>
    </div></CreditsProvider>
  );
}
