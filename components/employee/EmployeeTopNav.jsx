"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    name: "Wishlists",
    href: "/dashboard/employee/wishlists",
    icon: <span aria-hidden="true" className="text-lg">♡</span>,
  },
  {
    name: "Home",
    href: "/dashboard/employee",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
    )
  },
  {
    name: "Catalogue",
    href: "/dashboard/employee/wholesaler-gallery",
    icon: (
      <div style={{
        width: "17px",
        height: "17px",
        backgroundColor: "currentColor",
        WebkitMaskImage: "url('https://res.cloudinary.com/dcs0vuzwg/image/upload/v1778318363/catalogue_icon_rf0pjq.svg')",
        WebkitMaskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskImage: "url('https://res.cloudinary.com/dcs0vuzwg/image/upload/v1778318363/catalogue_icon_rf0pjq.svg')",
        maskSize: "contain",
        maskRepeat: "no-repeat",
        maskPosition: "center"
      }} />
    )
  },
  {
    name: "Queries",
    href: "/dashboard/employee/messages",
    icon: (
      <div style={{
        width: "17px",
        height: "17px",
        backgroundColor: "currentColor",
        WebkitMaskImage: "url('https://res.cloudinary.com/dcs0vuzwg/image/upload/v1778318363/query_icon_p7xfqk.svg')",
        WebkitMaskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskImage: "url('https://res.cloudinary.com/dcs0vuzwg/image/upload/v1778318363/query_icon_p7xfqk.svg')",
        maskSize: "contain",
        maskRepeat: "no-repeat",
        maskPosition: "center"
      }} />
    )
  },
  {
    name: "Orders",
    href: "/dashboard/employee/orders",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
        <line x1="12" y1="22.08" x2="12" y2="12"></line>
      </svg>
    )
  },
  { name: "Daily credits", href: "/dashboard/employee/credits", icon: <span aria-hidden="true">◈</span> },
];

export default function EmployeeBottomNav({ hasUnreadQueries = false, latestOrderUpdate = null, isRetailer = false }) {
  const pathname = usePathname();
  const [hasUnreadOrders, setHasUnreadOrders] = useState(false);

  // Check if we need to show the unread orders dot
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!latestOrderUpdate) {
        setHasUnreadOrders(false);
        return;
      }

      if (pathname === "/dashboard/employee/orders") {
        // If we're on the orders page, clear the dot and save the timestamp
        localStorage.setItem("employee_orders_last_checked", new Date().toISOString());
        setHasUnreadOrders(false);
      } else {
        // Check local storage against latest order update
        const lastChecked = localStorage.getItem("employee_orders_last_checked");
        if (!lastChecked || new Date(latestOrderUpdate) > new Date(lastChecked)) {
          setHasUnreadOrders(true);
        } else {
          setHasUnreadOrders(false);
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname, latestOrderUpdate]);

  const handleSwitchToAdmin = async () => {
    try {
      const res = await fetch("/api/auth/toggle-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "retailer" }),
      });
      if (res.ok) {
        window.location.href = "/dashboard/retailer";
      } else {
        // TODO: add proper error handling
      }
    } catch (err) {
      // TODO: add proper error handling
    }
  };

  return (
    <nav
      data-employee-nav
      aria-label="Employee navigation"
      className="fixed bottom-5 left-1/2 z-[100] -translate-x-1/2 max-w-[95vw] sm:max-w-max gap-[2px] lg:gap-1"
      style={{
        background: "rgba(255,255,255,0.55)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.45)",
        borderRadius: "100px",
        padding: "6px 6px",
        display: "flex",
        alignItems: "center",
        boxShadow: "0 8px 32px rgba(0,0,0,0.10), 0 1.5px 4px rgba(0,0,0,0.06)",
      }}
    >
      {navItems.map((item) => {
        const isActive =
          item.href === "/dashboard/employee"
            ? pathname === item.href
            : pathname.startsWith(item.href);
            
        // Check if this specific tab should show a notification dot
        const showDot = 
          (item.name === "Queries" && hasUnreadQueries) || 
          (item.name === "Orders" && hasUnreadOrders);

        return (
          <Link
            key={item.name}
            data-employee-nav-item
            aria-current={isActive ? "page" : undefined}
            aria-label={item.name}
            href={item.href}
            prefetch={true}
            className={`relative flex items-center gap-1.5 lg:gap-2 px-2.5 py-1.5 md:px-4 md:py-2 lg:px-5 lg:py-2.5 text-[11px] md:text-[12px] lg:text-[13px]`}
            style={{
              borderRadius: "100px",
              textDecoration: "none",
              fontWeight: isActive ? "600" : "500",
              color: isActive ? "#111827" : "#6b7280",
              background: isActive ? "rgba(255,255,255,0.85)" : "transparent",
              boxShadow: isActive ? "0 1px 6px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.2s ease",
              letterSpacing: "0.01em",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ opacity: isActive ? 1 : 0.7, display: "flex", position: "relative" }}>
              {item.icon}
              {/* Notification Dot */}
              {showDot && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 border border-white"></span>
                </span>
              )}
            </span>
            <span className="hidden sm:inline">{item.name}</span>
          </Link>
        );
      })}
      
      {isRetailer && (
        <button
          data-employee-admin-switch
          onClick={handleSwitchToAdmin}
          className="flex items-center gap-1.5 lg:gap-2 px-3 py-1.5 md:px-4 md:py-2 lg:px-5 lg:py-2.5 ml-1 select-none text-[11px] md:text-[12px] lg:text-[13px]"
          style={{
            borderRadius: "100px",
            border: "none",
            outline: "none",
            background: "linear-gradient(135deg, #3B82F6, #1D4ED8)",
            color: "#FFFFFF",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(29, 78, 216, 0.2)",
            transition: "transform 0.15s ease, opacity 0.15s ease",
            letterSpacing: "0.01em",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.9";
            e.currentTarget.style.transform = "scale(1.02)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span className="hidden lg:inline">Take me to dashboard</span>
          <span className="inline lg:hidden">Dashboard</span>
        </button>
      )}
    </nav>
  );
}
