import Link from "next/link";

export default function UploadButton({ className, iconSrc } = {}) {
  return (
    <Link
      href="/dashboard/wholesaler/add-product"
      className={className || "inline-flex items-center gap-2 rounded-lg cursor-pointer bg-black px-5 py-2.5 text-sm font-medium text-white shadow-md hover:bg-[#2a2a2a] active:scale-[0.97] transition-all duration-200"}
    >
      {iconSrc ? <img src={iconSrc} alt="" width="14.9053" height="14.9053" /> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>}
      Upload Now
    </Link>
  );
}
