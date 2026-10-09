import { createClient } from "../../../lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import EmployeeLayout from "../../../components/employee/EmployeeLayout";
import { CreditsProvider } from "../../../context/CreditsContext";
import { ensureVirtualEmployee } from "../../../lib/supabase/queries";
import {
  getEmployeeLatestOrderUpdate,
  getEmployeeRetailerTheme,
  getEmployeeRetailerShell,
  getEmployeeUnreadQueries,
} from "../../../lib/cache/retailerEmployee";
import { normalizeThemeId, THEME_STORAGE_KEY } from "../../../lib/config/themePreference";

export const metadata = {
  title: "Employee Dashboard — Jewel India",
  description: "View your store designs, browse wholesaler products, and manage messages.",
};

export default async function EmployeeDashboardLayout({ children }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entry_page/signin");
  }

  // Fetch the employee record linked to this auth user, auto-provisioning if retailer admin
  const employee = await ensureVirtualEmployee(user);

  if (!employee) {
    redirect("/entry_page/signin");
  }

  const cookieStore = await cookies();
  const cookieTheme = normalizeThemeId(cookieStore.get(THEME_STORAGE_KEY)?.value, null);

  const [retailerShell, hasUnreadQueries, latestOrderUpdate, fallbackTheme] = await Promise.all([
    getEmployeeRetailerShell(employee.retailer_id),
    getEmployeeUnreadQueries(employee.id),
    getEmployeeLatestOrderUpdate(employee.id),
    cookieTheme ? Promise.resolve(cookieTheme) : getEmployeeRetailerTheme(employee.retailer_id),
  ]);

  const selectedTheme = cookieTheme || fallbackTheme;

  const isRetailer = user.user_metadata?.role === "retailer";

  return (
    <CreditsProvider><EmployeeLayout
      employeeName={employee.full_name}
      businessName={retailerShell.businessName}
      hasUnreadQueries={hasUnreadQueries}
      latestOrderUpdate={latestOrderUpdate}
      isRetailer={isRetailer}
      selectedTheme={selectedTheme}
    >
      {children}
    </EmployeeLayout></CreditsProvider>
  );
}
