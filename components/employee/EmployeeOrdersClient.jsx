"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import ProtectedImage from "../shared/ProtectedImage";

const BusinessProfileModal = dynamic(
  () => import("../shared/BusinessProfileModal").then((mod) => mod.BusinessProfileModal),
  { loading: () => null }
);

const ConfirmationModal = dynamic(
  () => import("../shared/ConfirmationModal").then((mod) => mod.ConfirmationModal),
  { loading: () => null }
);

function HourglassIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 4H3M21 20H3M9 4v4l3 4-3 4v4M15 4v4l-3 4 3 4v4"/>
    </svg>
  );
}

function XCircleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6M9 9l6 6" />
    </svg>
  );
}


function StatusBadge({ status }) {
  if (status === "pending") {
    return (
      <div className="flex items-center gap-1.5 text-amber-500 text-[12px] font-medium">
        <HourglassIcon className="w-3.5 h-3.5" />
        <span>Requested</span>
      </div>
    );
  }
  if (status === "accepted" || status === "in_production") {
    return (
      <div className="flex items-center gap-1.5 text-purple-600 text-[12px] font-medium">
        <HourglassIcon className="w-3.5 h-3.5" />
        <span>In production</span>
      </div>
    );
  }
  if (status === "packed") {
    return (
      <div className="flex items-center gap-1.5 text-orange-500 text-[12px] font-medium">
        <HourglassIcon className="w-3.5 h-3.5" />
        <span>Packed</span>
      </div>
    );
  }
  if (status === "dispatched") {
    return (
      <div className="flex items-center gap-1.5 text-emerald-600 text-[12px] font-medium">
        <HourglassIcon className="w-3.5 h-3.5" />
        <span>Dispatched from wholesaler end</span>
      </div>
    );
  }
  if (status === "received" || status === "completed") {
    return (
      <div className="flex items-center gap-1.5 text-emerald-600 text-[12px] font-medium">
        <HourglassIcon className="w-3.5 h-3.5" />
        <span>Order received</span>
      </div>
    );
  }
  if (status === "rejected") {
    return (
      <div className="flex items-center gap-1.5 text-red-500 text-[12px] font-medium">
        <XCircleIcon className="w-3.5 h-3.5" />
        <span>Rejected</span>
      </div>
    );
  }
  return null;
}

function NoteBox({ note }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = note && note.length > 100;
  const displayText = expanded || !isLong ? note : note.slice(0, 100) + "...";

  return (
    <div className="w-full max-w-[400px] bg-[#FAFAFA] border border-dashed border-gray-300 rounded-[4px] p-4 relative mb-5">
      <p className="text-[12px] text-gray-600 leading-relaxed pr-4">
        {note ? displayText : <span className="italic text-gray-400">No customization notes provided.</span>}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider hover:text-black mt-1"
        >
          {expanded ? "Show Less" : "Read More"}
        </button>
      )}
    </div>
  );
}

function RejectionBox({ reason }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = reason && reason.length > 100;
  const displayText = expanded || !isLong ? reason : reason.slice(0, 100) + "...";

  return (
    <div className="w-full max-w-[400px] bg-red-50 border border-dashed border-red-200 rounded-[4px] p-4 relative mb-5">
      <p className="text-[11px] text-red-800 font-bold mb-1 uppercase tracking-wider">Rejection Reason</p>
      <p className="text-[12px] text-red-700 leading-relaxed pr-4">
        {reason ? displayText : <span className="italic text-red-400">No rejection reason provided.</span>}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] font-bold text-red-600 uppercase tracking-wider hover:text-red-800 mt-1"
        >
          {expanded ? "Show Less" : "Read More"}
        </button>
      )}
    </div>
  );
}

function OrderCard({ order, onUpdateStatus, onDeleteOrder, onBusinessClick }) {
  const p = order.products || {};
  const w = order.wholesalers || {};
  const imgUrl = p.generated_image_urls?.[0] || p.processed_image_url || p.raw_image_url;

  const typeLabel = p.jewellery_type
    ? p.jewellery_type.charAt(0).toUpperCase() + p.jewellery_type.slice(1)
    : "Jewellery";
  const categoryLabel = p.category
    ? p.category.charAt(0).toUpperCase() + p.category.slice(1)
    : "Item";
  const skuShort = order.id ? `#${order.id.split("-")[0].toUpperCase()} Q1` : "";

  const wholesalerName = w.business_name || "Wholesaler";
  const wholesalerAddress = [w.city, w.state].filter(Boolean).join(", ") || "Wholesalers address";

  return (
    <div data-employee-order-card className="flex flex-row gap-6 py-8 border-b border-gray-200 w-full items-start">

      {/* Left: Image */}
      <div className="w-[140px] h-[160px] shrink-0 bg-gray-100 overflow-hidden rounded-[2px] border border-gray-200">
        {imgUrl ? (
          <ProtectedImage src={imgUrl} alt={p.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[11px] text-gray-400">No Image</div>
        )}
      </div>

      {/* Right: Content */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Title Row */}
        <div className="flex justify-between items-start mb-0.5">
          <h3 className="text-[22px] font-bold text-[#111827] leading-none">{typeLabel}</h3>
          <StatusBadge status={order.status} />
        </div>

        {/* Sub meta */}
        <p className="text-[11px] text-gray-400 mb-4">
          {categoryLabel} • SKU {skuShort}
        </p>

        {/* Note Box */}
        <NoteBox note={order.customization_note} />

        {/* Rejection Reason (if rejected) */}
        {order.status === "rejected" && (
          <RejectionBox reason={order.rejection_reason} />
        )}

        {/* Make to order + Wholesaler name */}
        <p className="text-[12px] text-gray-600 mb-1.5">
          Make to order{" "}
          <span className="font-semibold text-black">
            {p.make_to_order_days ? `${p.make_to_order_days} days` : "3-4 days"}
          </span>
          <span className="mx-2 text-gray-300">|</span>
          <button
            onClick={() => onBusinessClick(w)}
            className="underline decoration-gray-400 underline-offset-2 text-gray-600 hover:text-black transition-colors"
          >
            {wholesalerName}
          </button>
        </p>

        {/* Delivery from */}
        <p className="text-[12px] text-gray-600 mb-4">
          Delivery from: <span className="font-medium text-black">{wholesalerAddress}</span>
        </p>

        {/* Action buttons — right-aligned */}
        <div className="flex justify-end gap-3 mt-auto">
          {order.status === "dispatched" && (
            <button
              onClick={() => onUpdateStatus(order.id, "received")}
              className="px-5 py-2 bg-[#111827] text-white text-[12px] font-medium rounded-full hover:bg-black transition-colors shadow-sm"
            >
              Marked received
            </button>
          )}
          {(order.status === "received" || order.status === "completed") && (
            <button
              disabled
              className="px-5 py-2 bg-[#111827] text-white text-[12px] font-medium rounded-full opacity-60 cursor-default"
            >
              Order shipped
            </button>
          )}
          {order.status === "rejected" && (
            <button
              onClick={() => onDeleteOrder(order.id)}
              className="px-5 py-2 bg-red-600 text-white text-[12px] font-medium rounded-full hover:bg-red-700 transition-colors shadow-sm"
            >
              Delete Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const tabs = [
  { id: "requested", label: "Requested", statuses: ["pending"] },
  { id: "active",    label: "Active Orders", statuses: ["accepted", "in_production", "packed", "dispatched"] },
  { id: "shipped",   label: "Shipped", statuses: ["received", "completed"] },
  { id: "rejected",  label: "Rejected", statuses: ["rejected"] },
];

export default function EmployeeOrdersClient({ initialOrders }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const isValidTab = tabs.some(t => t.id === tabParam);

  const [orders, setOrders] = useState(initialOrders);
  const [activeTab, setActiveTab] = useState(isValidTab ? tabParam : "requested");
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [pendingStatusChange, setPendingStatusChange] = useState(null);

  // Sync activeTab with URL
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // Handle browser back/forward navigation
  useEffect(() => {
    if (tabParam && tabs.some(t => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleDeleteOrder = async (orderId) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete order");
      setOrders(prev => prev.filter(o => o.id !== orderId));
      setOrderToDelete(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    // If not already confirmed (via modal), show modal for specific transitions
    if (!pendingStatusChange) {
      if (newStatus === "received") {
        setPendingStatusChange({
          orderId, newStatus,
          title: "Mark as Received?",
          message: "Are you sure you want to mark this order as received? This will move it to your Shipped tab.",
          variant: "success"
        });
        return;
      }
    }

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      const { data } = await res.json();
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...data } : o));
      setPendingStatusChange(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsUpdating(false);
    }
  };


  const counts = tabs.reduce((acc, tab) => {
    acc[tab.id] = orders.filter(o => tab.statuses.includes(o.status)).length;
    return acc;
  }, {});

  const filteredOrders = orders.filter(o => {
    const tab = tabs.find(t => t.id === activeTab);
    return tab ? tab.statuses.includes(o.status) : false;
  });

  return (
    <div data-employee-page="orders" className="w-full bg-white min-h-screen pb-24">

      {/* Header */}
      <div className="w-full max-w-3xl mx-auto px-6 pt-8 pb-4 relative">
        <Link
          href="/dashboard/employee"
          className="flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-black transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to home
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-[34px] font-serif text-[#111827] tracking-wide mb-1.5">Orders</h1>
          <p className="text-[13px] text-gray-500">Review and respond to orders from retailers.</p>
        </div>

        {/* Tabs */}
        <div data-employee-tabs className="flex items-center gap-0 border-b border-gray-200 mb-2">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                data-employee-tab
                data-active={isActive}
                aria-pressed={isActive}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-[13px] font-medium border-b-2 transition-all -mb-px ${
                  isActive
                    ? "border-black text-black"
                    : "border-transparent text-gray-400 hover:text-gray-700"
                }`}
              >
                {tab.label}
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                  isActive ? "bg-gray-100 text-gray-800" : "bg-gray-100 text-gray-400"
                }`}>
                  {counts[tab.id]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders list */}
      <div className="w-full max-w-3xl mx-auto px-6">
        {filteredOrders.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-gray-400 text-[14px]">No orders in this category.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onUpdateStatus={handleUpdateStatus}
                onDeleteOrder={(orderId) => setOrderToDelete(orderId)}
                onBusinessClick={(b) => setSelectedBusiness(b)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Business Profile Modal */}
      {selectedBusiness && (
        <BusinessProfileModal
          business={selectedBusiness}
          onClose={() => setSelectedBusiness(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!orderToDelete}
        onClose={() => setOrderToDelete(null)}
        onConfirm={() => handleDeleteOrder(orderToDelete)}
        title="Delete Order?"
        message="Are you sure you want to delete this rejected order? This action cannot be undone."
        confirmText="Yes, Delete"
        cancelText="No, Keep it"
      />

      {/* Status Change Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!pendingStatusChange}
        onClose={() => setPendingStatusChange(null)}
        onConfirm={() => handleUpdateStatus(pendingStatusChange.orderId, pendingStatusChange.newStatus)}
        title={pendingStatusChange?.title}
        message={pendingStatusChange?.message}
        variant={pendingStatusChange?.variant}
        confirmText="Yes, Proceed"
        cancelText="Cancel"
      />

      {/* Loading overlay */}
      {isUpdating && (
        <div className="fixed inset-0 z-[100] bg-white/50 backdrop-blur-sm flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-black border-t-transparent"></div>
        </div>
      )}
    </div>
  );
}
