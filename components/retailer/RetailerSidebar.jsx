"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { signOut } from "../../lib/actions/auth";
import { memo, useMemo, useState, useEffect, useRef } from "react";

const NAV_ITEMS = [
  {
    name: "Dashboard",
    iconSrc: "/retailer-admin/nav-dashboard.svg",
    href: "/dashboard/retailer",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="8" height="8" rx="1.5"/>
        <rect x="13" y="3" width="8" height="8" rx="1.5"/>
        <rect x="3" y="13" width="8" height="8" rx="1.5"/>
        <rect x="13" y="13" width="8" height="8" rx="1.5"/>
      </svg>
    ),
  },
  {
    name: "Employees",
    iconSrc: "/retailer-admin/nav-employees.svg",
    href: "/dashboard/retailer/employees",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    name: "Catalogue",
    iconSrc: "/retailer-admin/nav-catalogue.svg",
    href: "/dashboard/retailer/catalogue",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    name: "Your Taste",
    iconSrc: "/retailer-admin/nav-taste.svg",
    href: "/dashboard/retailer/your-taste",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    ),
  },
  {
    name: "Store Theme",
    iconSrc: "/retailer-admin/nav-theme.svg",
    href: "/dashboard/retailer/theme",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
        <path d="M19.07 4.93L4.93 19.07"/>
      </svg>
    ),
  },
  { name: "Wishlists", href: "/dashboard/retailer/wishlists", icon: <span aria-hidden="true">♡</span> },
  { name: "Daily credits", href: "/dashboard/retailer/credits", icon: <span aria-hidden="true">◈</span> },
];

function RetailerSidebar({ retailer }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const sidebarRef = useRef(null);

  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const handleWheel = (e) => {
      const { scrollTop, scrollHeight, clientHeight } = sidebar;
      const isScrollable = scrollHeight - clientHeight > 1;

      if (!isScrollable) {
        e.preventDefault();
        return;
      }

      const deltaY = e.deltaY;
      const isScrollingUp = deltaY < 0;
      const isScrollingDown = deltaY > 0;

      if (isScrollingUp && scrollTop <= 0) {
        e.preventDefault();
      } else if (isScrollingDown && scrollTop + clientHeight >= scrollHeight - 1) {
        e.preventDefault();
      }
    };

    const handleTouchMove = (e) => {
      const { scrollHeight, clientHeight } = sidebar;
      const isScrollable = scrollHeight - clientHeight > 1;

      if (!isScrollable) {
        e.preventDefault();
      }
    };

    sidebar.addEventListener("wheel", handleWheel, { passive: false });
    sidebar.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      sidebar.removeEventListener("wheel", handleWheel);
      sidebar.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  const navItems = useMemo(
    () =>
      NAV_ITEMS.map((item) => ({
        ...item,
        isActive:
          item.href === "/dashboard/retailer"
            ? pathname === item.href
            : pathname.startsWith(item.href),
      })),
    [pathname]
  );

  const retailerName = retailer?.full_name || "User";
  const businessName = retailer?.business_name || "Business";
  const logoUrl =
    retailer?.business_logo_url ||
    "https://res.cloudinary.com/dcs0vuzwg/image/upload/v1777013959/jewel_logo_rhgin9.svg";

  return (
    <>
      {/* Top Header Bar for Mobile/Tablet */}
      <header className="fixed top-0 left-0 right-0 h-[60px] bg-white border-b border-gray-100 z-40 flex items-center justify-between px-4 hidden md:flex lg:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOpen(true)}
            className="p-1.5 text-gray-600 hover:text-black focus:outline-none rounded-md hover:bg-gray-50 active:scale-95 transition-all"
            aria-label="Open navigation menu"
            style={{ minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyItems: "center" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-[28px] h-[28px] rounded-full overflow-hidden bg-gray-200 shrink-0">
              <Image src={logoUrl} alt="Logo" width={28} height={28} className="object-cover w-full h-full" />
            </div>
            <span className="text-[14px] font-bold text-[#111111] truncate max-w-[140px]">{businessName}</span>
          </div>
        </div>

        <Link
          href="?modal=add-employee"
          scroll={false}
          className="h-[36px] px-3.5 rounded-[8px] flex items-center justify-center text-[12px] font-semibold text-[#3B82F6] hover:opacity-90 transition-opacity bg-[#DBEAFE] shrink-0"
        >
          New Employee
        </Link>
      </header>

      {/* Backdrop for open drawer on mobile/tablet */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 hidden md:block lg:hidden animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Floating Bottom Nav for Mobile */}
      <nav className="retailer-bottom-nav">
        {[
          navItems[0], // Dashboard
          navItems[2], // Catalogue
          navItems[1], // Employees
          navItems[3], // Your Taste
        ].map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`bottom-nav-item ${item.isActive ? "active" : ""}`}
            title={item.name}
            style={{
              opacity: item.isActive ? 1 : 0.45,
            }}
          >
            <span className={item.isActive ? "text-[#111111]" : "text-[#9CA3AF]"}>
              {item.icon}
            </span>
          </Link>
        ))}

        {/* More Menu Trigger (using Business Logo) */}
        <button
          onClick={() => setIsMoreOpen(!isMoreOpen)}
          className={`bottom-nav-item ${isMoreOpen ? "active" : ""}`}
          style={{
            border: "none",
            outline: "none",
            cursor: "pointer",
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative"
          }}
          title="More Options"
        >
          <div className={`w-[28px] h-[28px] rounded-full overflow-hidden bg-gray-200 border-2 transition-all duration-300 ${isMoreOpen ? 'border-black' : 'border-gray-100'}`}>
            <Image
              src={logoUrl}
              alt="More options logo"
              width={28}
              height={28}
              className="object-cover w-full h-full"
            />
          </div>
        </button>
      </nav>

      {/* More Popover Options Menu */}
      {isMoreOpen && (
        <div className="bottom-nav-popover" onClick={() => setIsMoreOpen(false)}>
          <div className="bottom-nav-popover-content" onClick={(e) => e.stopPropagation()}>
            <Link href="/dashboard/retailer/wishlists" onClick={() => setIsMoreOpen(false)} className="popover-item">Customer wishlists</Link>
            <Link href="/dashboard/retailer/credits" onClick={() => setIsMoreOpen(false)} className="popover-item">Daily credits</Link>
            {/* Store Theme */}
            <Link 
              href="/dashboard/retailer/theme" 
              onClick={() => setIsMoreOpen(false)}
              className="popover-item"
            >
              <span className="text-[#9CA3AF]">
                {navItems[4].icon}
              </span>
              <span>Store Theme</span>
            </Link>

            {/* Toggle Context (Employee View) */}
            <button
              onClick={async () => {
                setIsMoreOpen(false);
                try {
                  const res = await fetch("/api/auth/toggle-view", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ mode: "employee" }),
                  });
                  if (res.ok) {
                    window.location.href = "/dashboard/employee";
                  }
                } catch (err) {
                  // silent
                }
              }}
              className="popover-item"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#9CA3AF]">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span>Employee View</span>
            </button>

            {/* Logout */}
            <form action={signOut} onSubmit={() => setIsMoreOpen(false)} className="w-full">
              <button 
                type="submit"
                className="popover-item popover-logout"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Logout</span>
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @media (max-height: 780px) {
          .sidebar-profile {
            margin-bottom: 12px !important;
          }
          .sidebar-new-emp {
            margin-bottom: 12px !important;
            height: 38px !important;
          }
          .sidebar-nav-item {
            height: 36px !important;
          }
        }

        .retailer-bottom-nav {
          display: none;
        }

        /* Responsive Nav & Sidebar Styles */
        @media (max-width: 767px) {
          .retailer-bottom-nav {
            display: flex;
            position: fixed;
            bottom: calc(20px + env(safe-area-inset-bottom, 0px));
            left: 50%;
            transform: translateX(-50%);
            width: 90vw;
            max-width: 400px;
            height: 60px;
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.5);
            border-radius: 100px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1), 0 1.5px 4px rgba(0,0,0,0.06);
            align-items: center;
            justify-content: space-around;
            padding: 0 12px;
            z-index: 100;
          }
          .bottom-nav-item {
            width: 44px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.2s ease;
            position: relative;
          }
          .bottom-nav-item.active {
            background: rgba(0, 0, 0, 0.05);
          }
          .bottom-nav-item svg {
            color: #111111;
          }
          .bottom-nav-popover {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(2px);
            -webkit-backdrop-filter: blur(2px);
            z-index: 99;
          }
          .bottom-nav-popover-content {
            position: fixed;
            bottom: calc(90px + env(safe-area-inset-bottom, 0px));
            left: 50%;
            transform: translateX(-50%);
            width: 200px;
            background: #ffffff;
            border: 1px solid rgba(0, 0, 0, 0.08);
            border-radius: 16px;
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
            padding: 8px;
            display: flex;
            flex-direction: column;
            gap: 4px;
            animation: popoverFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .popover-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            border-radius: 10px;
            color: #374151;
            font-size: 14px;
            font-weight: 500;
            text-decoration: none;
            background: transparent;
            border: none;
            cursor: pointer;
            width: 100%;
            text-align: left;
            transition: background-color 0.15s ease;
          }
          .popover-item:hover {
            background: #f3f4f6;
          }
          .popover-logout {
            color: #ef4444;
          }
          .popover-logout:hover {
            background: #fef2f2;
          }
        }
        @keyframes popoverFadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, 10px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
      `}</style>

      {/* Sidebar: "New Employee" button above a floating white card (Figma: Retailer admin page) */}
      <aside
        ref={sidebarRef}
        className={`fixed top-0 left-0 h-dvh z-50 w-[230px] flex-col gap-3 bg-[#f1f2f3] px-[19px] pt-[27px] pb-[36px] transition-transform duration-300 lg:translate-x-0 overflow-y-auto overflow-x-hidden overscroll-contain hidden md:flex ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Close button inside drawer for tablet */}
        <div className="flex justify-end lg:hidden shrink-0">
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-gray-500 hover:text-black focus:outline-none"
            aria-label="Close navigation menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <Link
          href="?modal=add-employee"
          scroll={false}
          onClick={() => setIsOpen(false)}
          className="w-[192px] h-[52px] rounded-[10px] bg-[#c3d6ff] hidden lg:flex items-center justify-center text-[14px] font-medium tracking-[-0.15px] text-[#1e70f6] hover:opacity-90 transition-opacity shrink-0"
        >
          New Employee
        </Link>

        <div className="w-[192px] flex-1 min-h-[600px] max-h-[705px] bg-white rounded-[12px] flex flex-col px-[4px] shrink-0">
          {/* Profile */}
          <div className="flex items-center gap-[4px] h-[80px] px-[4px] shrink-0">
            <div className="w-[40px] h-[40px] rounded-[8px] overflow-hidden bg-gray-200 shrink-0">
              <Image src={logoUrl} alt="Logo" width={40} height={40} className="object-cover w-full h-full" />
            </div>
            <div className="flex flex-col gap-[2px] min-w-0">
              <span className="text-[16px] font-medium text-[#404040] truncate leading-normal">{retailerName}</span>
              <span className="text-[14px] font-medium text-[#727272] truncate leading-normal">{businessName}</span>
            </div>
          </div>
          <div className="border-t border-[#e5e5e5] shrink-0" />

          {/* Navigation */}
          <nav className="flex flex-col gap-[4px] pt-[16px] pb-[16px] shrink-0">
            {navItems.slice(0, 5).map((item) => (
              <Link
                key={item.name}
                href={item.href}
                prefetch={true}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-[12px] h-[36px] rounded-[8px] px-[12px] transition-colors shrink-0 text-[14px] font-medium tracking-[-0.15px] text-[#525252] ${
                  item.isActive ? "bg-[rgba(1,10,15,0.1)]" : "hover:bg-[rgba(1,10,15,0.05)]"
                }`}
              >
                <img src={item.iconSrc} alt="" width={item.name === "Catalogue" ? 17 : 16} height={16} className="shrink-0" />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="border-t border-[#e5e5e5] shrink-0" />

          {/* Not in the Figma: kept so wishlists, credits and employee view stay reachable */}
          <nav className="flex flex-col gap-[4px] pt-[16px] shrink-0">
            {navItems.slice(5).map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-[12px] h-[36px] rounded-[8px] px-[12px] transition-colors text-[14px] font-medium tracking-[-0.15px] text-[#525252] ${
                  item.isActive ? "bg-[rgba(1,10,15,0.1)]" : "hover:bg-[rgba(1,10,15,0.05)]"
                }`}
              >
                <span className="w-[16px] text-center text-[#525252]">{item.icon}</span>
                {item.name}
              </Link>
            ))}
            <button
              onClick={async () => {
                setIsOpen(false);
                try {
                  const res = await fetch("/api/auth/toggle-view", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ mode: "employee" }),
                  });
                  if (res.ok) window.location.href = "/dashboard/employee";
                } catch {
                  // stays on the retailer view
                }
              }}
              className="flex items-center gap-[12px] h-[36px] rounded-[8px] px-[12px] text-[14px] font-medium tracking-[-0.15px] text-[#525252] hover:bg-[rgba(1,10,15,0.05)] text-left"
            >
              <img src="/retailer-admin/nav-employees.svg" alt="" width={16} height={16} className="shrink-0" />
              Employee view
            </button>
          </nav>

          <div className="flex-1" />
          <div className="flex justify-center pointer-events-none shrink-0 pb-[16px]">
            <Image src="/retailer-admin/sidebar-illustration.png" alt="" width={130} height={130} className="object-cover" />
          </div>
          <div className="border-t border-[#e5e5e5] shrink-0" />
          <form action={signOut} onSubmit={() => setIsOpen(false)} className="py-[10px] shrink-0">
            <button
              type="submit"
              className="flex items-center gap-[12px] w-full h-[36px] rounded-[8px] px-[12px] text-[14px] font-medium tracking-[-0.15px] text-[#525252] hover:bg-[rgba(1,10,15,0.05)]"
            >
              <img src="/retailer-admin/nav-logout.svg" alt="" width={16} height={16} className="shrink-0" />
              LOG OUT
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}

export default memo(RetailerSidebar, (prev, next) => prev.retailer === next.retailer);
