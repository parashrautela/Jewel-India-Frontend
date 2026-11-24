import { getAuthUser } from "../../../lib/supabase/queries";
import { getRetailerDashboardData } from "../../../lib/cache/retailerEmployee";
import DashboardStats from "../../../components/retailer/DashboardStats";
import EmployeePortalCard from "../../../components/retailer/EmployeePortalCard";
import DashboardDirectory from "../../../components/retailer/DashboardDirectory";
import Link from "next/link";

export default async function RetailerDashboardPage() {
  const user = await getAuthUser();

  let employeesCount = 0;
  let activeEmployeesCount = 0;
  let activeDesigns = 0;
  let totalDesigns = 0;
  let archivedDesigns = 0;
  let recentEmployees = [];

  if (user) {
    const dashboardData = await getRetailerDashboardData(user.id);
    employeesCount = dashboardData.employeesCount;
    activeEmployeesCount = dashboardData.activeEmployeesCount;
    totalDesigns = dashboardData.totalDesigns;
    activeDesigns = dashboardData.activeDesigns;
    archivedDesigns = dashboardData.archivedDesigns;
    recentEmployees = dashboardData.recentEmployees;
  }

  const actionCard = "bg-white border border-[#e2e8f0] rounded-[24px] p-[25px] h-[121px] flex items-center gap-[16px] hover:border-[#cbd5e1] transition-colors";

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 w-full max-w-[895px] px-6 lg:pl-0 lg:pr-9 pt-[27px] pb-10">
        <div className="flex flex-col">

          {/* Header */}
          <div className="flex flex-col gap-[4px]">
            <h1 className="text-[24px] leading-[32px] font-bold text-[#0f172b] tracking-[0.07px]">Dashboard</h1>
            <p className="text-[14px] leading-[20px] font-medium text-[#62748e] tracking-[-0.15px]">Welcome back! Here&apos;s your store overview</p>
          </div>

          {/* Row 1: stat cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[240px_240px_367px] gap-[24px] mt-[28px]">
            <DashboardStats
              employeesCount={employeesCount}
              activeEmployeesCount={activeEmployeesCount}
              activeDesigns={activeDesigns}
              totalDesigns={totalDesigns}
              archivedDesigns={archivedDesigns}
              isLoading={false}
            />
            <EmployeePortalCard />
          </div>

          {/* Row 2: quick actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px] mt-[28px] max-w-[804px]">
            <Link href="?modal=add-employee" scroll={false} className={actionCard}>
              <div className="w-[70px] h-[71px] rounded-[10px] bg-[#dbeafe] flex items-center justify-center shrink-0">
                <img src="/retailer-admin/add-employee.svg" alt="" width={24} height={24} />
              </div>
              <div className="flex flex-col gap-[4px]">
                <h3 className="text-[18px] leading-[27px] font-bold text-[#0f172b] tracking-[-0.44px]">Add New Employee</h3>
                <p className="text-[14px] leading-[20px] text-[#62748e] tracking-[-0.15px] max-w-[233px]">Create employee accounts and login credentials</p>
              </div>
            </Link>

            <Link href="/dashboard/retailer/catalogue/upload" className={actionCard}>
              <div className="w-[70px] h-[71px] rounded-[10px] bg-[#f3e8ff] flex items-center justify-center shrink-0">
                <img src="/retailer-admin/upload-design.svg" alt="" width={24} height={24} />
              </div>
              <div className="flex flex-col gap-[4px]">
                <h3 className="text-[18px] leading-[27px] font-bold text-[#0f172b] tracking-[-0.44px]">Upload Design</h3>
                <p className="text-[14px] leading-[20px] text-[#62748e] tracking-[-0.15px] max-w-[279px]">Add new jewellery designs to your private catalogue</p>
              </div>
            </Link>
          </div>

          {/* Row 3: Employee Directory */}
          <div className="w-full max-w-[809px] bg-white border border-[#e2e8f0] rounded-[24px] mt-[28px] px-[24px] pt-[20px] pb-[8px]">
            <h2 className="text-[18px] leading-[27px] font-bold text-[#0f172b] tracking-[-0.44px] pb-[20px]">Employee Directory</h2>
            <DashboardDirectory initialEmployees={recentEmployees} />
          </div>

        </div>
      </div>
    </div>
  );
}
