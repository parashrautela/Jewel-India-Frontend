import Link from "next/link";
import { memo } from "react";

/** Black 38 px circle with the up-right arrow (Figma: Retailer admin page → Dashboard). */
export const ArrowCircle = ({ href, onClick, label }) => {
  const inner = (
    <>
      <img src="/retailer-admin/arrow-circle.svg" alt="" width={38} height={38} className="absolute inset-0" />
      <img src="/retailer-admin/arrow.svg" alt="" width={24} height={24} className="relative rotate-90" />
    </>
  );
  const cls = "relative w-[38px] h-[38px] flex items-center justify-center shrink-0 hover:opacity-85 transition-opacity";
  return href ? (
    <Link href={href} className={cls} aria-label={label}>{inner}</Link>
  ) : (
    <button type="button" onClick={onClick} className={cls} aria-label={label}>{inner}</button>
  );
};

export const statCard = "bg-white rounded-[24px] h-[160px] w-full px-[16px] pt-[16px] pb-[18px] flex flex-col justify-between";
export const statTitle = "text-[20px] font-medium tracking-[-0.4px] text-[rgba(0,0,0,0.8)] leading-[38px]";

function DashboardStats({
  employeesCount,
  activeEmployeesCount,
  activeDesigns,
  totalDesigns,
  archivedDesigns,
  isLoading,
}) {
  if (isLoading) {
    return (
      <>
        <div className={`${statCard} animate-pulse`} />
        <div className={`${statCard} animate-pulse`} />
      </>
    );
  }

  const inactiveEmployees = (employeesCount || 0) - (activeEmployeesCount || 0);

  return (
    <>
      {/* Total Employee */}
      <div className={statCard}>
        <h3 className={statTitle}>Total Employee</h3>
        <div>
          <div className="flex items-baseline gap-[6px]">
            <span className="text-[64px] font-medium tracking-[-1.28px] text-black leading-[0.75]">
              {activeEmployeesCount || 0}
            </span>
            <span className="text-[20px] font-medium tracking-[-0.4px] text-[rgba(0,0,0,0.54)]">Active</span>
          </div>
          <p className="text-[14px] font-medium tracking-[-0.28px] text-[#999] mt-[14px]">
            {employeesCount || 0} total <span className="text-black">• {inactiveEmployees} inactive</span>
          </p>
        </div>
      </div>

      {/* Store Designs */}
      <div className={statCard}>
        <div className="flex justify-between items-start">
          <h3 className={statTitle}>Store Designs</h3>
          <ArrowCircle href="/dashboard/retailer/catalogue" label="Open catalogue" />
        </div>
        <div>
          <span className="block text-[64px] font-medium tracking-[-1.28px] text-black leading-[0.75]">
            {activeDesigns || 0}
          </span>
          <p className="text-[14px] font-medium tracking-[-0.28px] text-[#999] mt-[14px]">
            {totalDesigns || 0} total <span className="text-black">• {archivedDesigns || 0} archived</span>
          </p>
        </div>
      </div>
    </>
  );
}

export default memo(DashboardStats);
