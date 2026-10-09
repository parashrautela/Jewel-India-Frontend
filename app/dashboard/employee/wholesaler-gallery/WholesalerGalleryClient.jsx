"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import EmployeeBottomNav from "@/components/employee/EmployeeTopNav";
import useLongPress from "@/lib/hooks/useLongPress";

const ProductInfoModal = dynamic(
  () => import("@/components/employee/ProductInfoModal").then((mod) => mod.ProductInfoModal),
  { loading: () => null }
);

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ProductCard({ product, onClick, onLongPress }) {
  const [imgError, setImgError] = useState(false);
  const title = product.title || product.jewellery_type || "Untitled";
  const imageUrl = product.processed_image_url || 
                   (product.generated_image_urls && product.generated_image_urls.length > 0 ? product.generated_image_urls[0] : null) || 
                   product.raw_image_url || 
                   product.image_url;

  const longPressProps = useLongPress({
    onLongPress: () => onLongPress && onLongPress(product),
    onClick: () => onClick && onClick(product),
    delay: 500,
  });

  return (
    <div
      {...longPressProps}
      data-employee-product-card
      className={`flex flex-col cursor-pointer group/card bg-white transition-all duration-300 ${
        longPressProps.isPressing ? "scale-95 opacity-80" : ""
      }`}
    >
      {/* Image container — Full bleed */}
      <div
        className="w-full bg-[#f4f4f4] flex items-center justify-center overflow-hidden relative"
        style={{ aspectRatio: "1/1" }}
      >
        {!imgError && imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform group-hover/card:scale-105 duration-700 mix-blend-multiply"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-[12px] text-gray-300 font-light">No image</span>
        )}
      </div>
      {/* Label */}
      <div className="mt-4 text-center px-2">
        <span data-employee-product-title className="font-serif text-[15px] text-gray-800 tracking-wide line-clamp-1">
          {title}
        </span>
      </div>
    </div>
  );
}

function FilterDropdown({ label, options, selected, onChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (opt) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((o) => o !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-between rounded-[24px] border border-gray-200 px-5 py-2.5 bg-white text-[13px] font-medium text-gray-600 hover:border-gray-300 focus:outline-none transition-colors w-[130px] shadow-sm"
      >
        <span className="flex items-center gap-2">
          {label}
          {selected.length > 0 && (
            <span className="bg-black text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center font-bold">
              {selected.length}
            </span>
          )}
        </span>
        <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
          <div className="origin-top-left absolute left-0 mt-2 w-48 rounded-[12px] shadow-xl bg-white ring-1 ring-black ring-opacity-5 z-20 overflow-hidden">
            <div className="py-2" role="menu">
              {options.map((opt) => (
                <label key={opt} className="flex items-center px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mr-3 h-4 w-4 rounded-[4px] border-gray-300 text-black focus:ring-black cursor-pointer"
                    checked={selected.includes(opt)}
                    onChange={() => toggleOption(opt)}
                  />
                  <span className="capitalize">{opt}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function WholesalerGalleryClient({ products, categoryTabs, initialCategory = "all" }) {
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const router = useRouter();

  const handleLongPress = (product) => {
    const stored = JSON.parse(sessionStorage.getItem('employee_selected_products') || "[]");
    let nextStored;
    if (stored.includes(product.id)) {
      nextStored = stored.filter(id => id !== product.id);
      alert(`${product.title || product.jewellery_type || "Product"} removed from selection.`);
    } else {
      nextStored = [...stored, product.id];
      alert(`${product.title || product.jewellery_type || "Product"} added to selection.`);
    }
    sessionStorage.setItem('employee_selected_products', JSON.stringify(nextStored));
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Scroll visibility state: 'top', 'down', 'up'
  const [scrollState, setScrollState] = useState('top');
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          if (currentScrollY < 50) {
            setScrollState('top');
          } else if (currentScrollY > lastScrollY.current) {
            setScrollState('down');
          } else if (currentScrollY < lastScrollY.current) {
            setScrollState('up');
          }
          lastScrollY.current = currentScrollY;
          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const [filters, setFilters] = useState({
    size: [],
    weight: [],
    availability: [],
    purity: [],
  });

  const FILTER_OPTIONS = {
    size: ["small", "medium", "large", "adjustable"],
    weight: ["0-2g", "3-5g", "5-10g", "11-20g", "20-30g", "30g+"],
    availability: ["in stock", "within 5 days", "within 15 days", "within 30 days", "more than 30 days"],
    purity: ["18k", "22k", "24k"],
  };

  const PREDEFINED_ICONS = {
    necklace: "https://res.cloudinary.com/dcs0vuzwg/image/upload/v1777351898/necklace_jqvgjm.svg",
    necklaces: "https://res.cloudinary.com/dcs0vuzwg/image/upload/v1777351898/necklace_jqvgjm.svg",
    pendants: "https://res.cloudinary.com/dcs0vuzwg/image/upload/v1777351894/pendants_d9uvap.svg",
    pendant: "https://res.cloudinary.com/dcs0vuzwg/image/upload/v1777351894/pendants_d9uvap.svg",
    mangalsutras: "https://res.cloudinary.com/dcs0vuzwg/image/upload/v1777351896/mangalsutra_dmoj14.svg",
    mangalsutra: "https://res.cloudinary.com/dcs0vuzwg/image/upload/v1777351896/mangalsutra_dmoj14.svg",
    chain: "https://res.cloudinary.com/dcs0vuzwg/image/upload/v1777351896/chains_tqfmhp.svg",
    chains: "https://res.cloudinary.com/dcs0vuzwg/image/upload/v1777351896/chains_tqfmhp.svg",
    bangles: "https://res.cloudinary.com/dcs0vuzwg/image/upload/v1777351896/bangles_ln2p2a.svg",
    bangle: "https://res.cloudinary.com/dcs0vuzwg/image/upload/v1777351896/bangles_ln2p2a.svg",
    harams: "/image/haram_svg.svg",
    haram: "/image/haram_svg.svg",
    ring: "https://res.cloudinary.com/dcs0vuzwg/image/upload/v1777351897/rings_mbtqqr.svg",
    rings: "https://res.cloudinary.com/dcs0vuzwg/image/upload/v1777351897/rings_mbtqqr.svg",
    earring: "https://res.cloudinary.com/dcs0vuzwg/image/upload/v1777351897/earrings_m7kzmd.svg",
    earrings: "https://res.cloudinary.com/dcs0vuzwg/image/upload/v1777351897/earrings_m7kzmd.svg",
    nosepin: "https://res.cloudinary.com/dcs0vuzwg/image/upload/v1777351899/acessiories_vgm6lr.svg",
    nosepins: "https://res.cloudinary.com/dcs0vuzwg/image/upload/v1777351899/acessiories_vgm6lr.svg",
  };

  const categoryImages = useMemo(() => {
    const map = {};
    products.forEach(p => {
      const cat = (p.category || "uncategorized").toLowerCase();
      const imageUrl = p.processed_image_url || 
                       (p.generated_image_urls && p.generated_image_urls.length > 0 ? p.generated_image_urls[0] : null) || 
                       p.raw_image_url || 
                       p.image_url;
      if (!map[cat] && imageUrl) {
        map[cat] = imageUrl;
      }
    });
    return map;
  }, [products]);

  const STATIC_CATEGORIES = [
    "Necklace",
    "Haram",
    "Pendants",
    "Mangalsutras",
    "Chains",
    "Bangles",
    "Rings",
    "Earrings",
    "Nosepin"
  ];

  const displayTabs = STATIC_CATEGORIES;

  const filteredProducts = useMemo(() => {
    let result = products;

    if (activeCategory !== "all") {
      const baseActive = activeCategory.toLowerCase().replace(/s$/, ''); // necklace, pendant, mangalsutra, etc.

      result = result.filter((p) => {
        const cat = (p.category || "").toLowerCase();
        const type = (p.jewellery_type || "").toLowerCase();
        const tags = Array.isArray(p.tags) ? p.tags.map(t => t.toLowerCase()) : [];

        // Match if any field contains the base category name
        const isMatch = cat.includes(baseActive) ||
          type.includes(baseActive) ||
          tags.some(t => t.includes(baseActive));

        return isMatch;
      });
    }

    if (filters.size.length > 0) {
      result = result.filter((p) => {
        const sizeFieldMatch = p.size && filters.size.includes(p.size.toLowerCase());
        const tags = Array.isArray(p.tags) ? p.tags.map(t => t.toLowerCase()) : [];
        const tagMatch = filters.size.some(s => tags.includes(s));
        return sizeFieldMatch || tagMatch;
      });
    }

    if (filters.purity.length > 0) {
      result = result.filter((p) => {
        const purityFieldMatch = p.metal_purity && filters.purity.includes(p.metal_purity.toLowerCase());
        const tags = Array.isArray(p.tags) ? p.tags.map(t => t.toLowerCase()) : [];
        const tagMatch = filters.purity.some(pu => tags.includes(pu));
        return purityFieldMatch || tagMatch;
      });
    }

    if (filters.weight.length > 0) {
      result = result.filter((p) => {
        const w = Number(p.net_weight);
        if (isNaN(w) || w <= 0) return false;

        return filters.weight.some((range) => {
          if (range === "0-2g") return w <= 2;
          if (range === "3-5g") return w > 2 && w <= 5;
          if (range === "5-10g") return w > 5 && w <= 10;
          if (range === "11-20g") return w > 10 && w <= 20;
          if (range === "20-30g") return w > 20 && w <= 30;
          if (range === "30g+") return w > 30;
          return false;
        });
      });
    }

    if (filters.availability.length > 0) {
      result = result.filter((p) => {
        return filters.availability.some((avail) => {
          if (avail === "in stock") return p.stock_available > 0;

          if (p.stock_available > 0) return false;

          const days = Number(p.make_to_order_days);
          if (isNaN(days)) return false;

          if (avail === "within 5 days") return days <= 5;
          if (avail === "within 15 days") return days > 5 && days <= 15;
          if (avail === "within 30 days") return days > 15 && days <= 30;
          if (avail === "more than 30 days") return days > 30;
          return false;
        });
      });
    }

    return result;
  }, [products, activeCategory, filters]);

  const updateFilter = (filterKey, selectedList) => {
    setFilters((prev) => ({ ...prev, [filterKey]: selectedList }));
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, filters]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const currentProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    const params = new URLSearchParams();
    if (cat !== "all") params.set("category", cat);
    router.push(`?${params.toString()}`);
  };

  const [isStartingChat, setIsStartingChat] = useState(false);
  const handleStartChat = async (product) => {
    setIsStartingChat(true);
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: product.id }),
      });
      if (!res.ok) throw new Error("Failed to start chat");
      router.push("/dashboard/employee/messages");
    } catch (err) {
      alert("Could not start chat. Please try again.");
    } finally {
      setIsStartingChat(false);
    }
  };

  return (
    <div data-employee-page="catalogue" className={`flex flex-col w-full min-h-screen pb-24 ${selectedProduct ? "bg-transparent" : "bg-white"}`}>

      {/* Smart Sticky Header */}
      <div
        data-employee-sticky
        className={`sticky z-40 bg-white/95 backdrop-blur-md transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) w-full border-b border-gray-100 ${scrollState === 'top' ? 'translate-y-0 top-0 pt-8 pb-6 shadow-none' :
            scrollState === 'down' ? 'translate-y-0 top-0 pt-3 pb-3 shadow-sm' :
              '-translate-y-full top-0 pt-3 pb-3 shadow-sm'
          }`}
      >
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8 flex flex-col transition-all duration-700 ease-in-out">

          {/* Top Title & Back - Hidden when scrolling down/up */}
          <div data-employee-browse-top data-expanded={scrollState === 'top'} className={`relative w-full flex items-center justify-center transition-all duration-700 ease-in-out overflow-hidden ${scrollState === 'top' ? 'max-h-[120px] opacity-100 mb-16' : 'max-h-0 opacity-0 pointer-events-none mb-0'}`}>
            <button 
              onClick={() => window.history.back()}
              className="absolute left-0 w-12 h-12 flex items-center justify-center rounded-full border border-gray-100 text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all shadow-sm"
              aria-label="Go back"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            </button>
          </div>

          <div data-employee-browse-controls className="flex flex-col gap-10">
            {/* Curated Collection Header - Hidden when scrolling down/up */}
            <div className={`transition-all duration-700 ease-in-out overflow-hidden ${scrollState === 'top' ? 'max-h-[100px] opacity-100 mb-0' : 'max-h-0 opacity-0 pointer-events-none mb-0'}`}>
              <h2 className="text-[24px] md:text-[28px] font-serif text-[#111827] leading-tight mb-2">
                Curated Collection
              </h2>
              <p className="text-[14px] md:text-[16px] text-gray-400 font-medium">
                From everyday elegance to statement pieces
              </p>
            </div>

            {/* Categories & Filters */}
            <div data-employee-browse-filters data-expanded={scrollState === 'top'} className={`flex flex-col transition-all duration-700 ease-in-out ${scrollState === 'top' ? 'gap-12' : 'gap-0'}`}>
              
              {/* Category Row - Optimized for Tablet/Mobile fit */}
              <div className={`flex items-center justify-center transition-all duration-700 ease-in-out overflow-hidden ${scrollState === 'top' ? 'max-h-[400px] opacity-100 mb-0' : 'max-h-0 opacity-0 pointer-events-none mb-0'}`}>
                <div className="flex flex-wrap items-start justify-start gap-x-4 md:gap-x-8 gap-y-6 w-full py-4">
                  {displayTabs.filter(t => t.toLowerCase() !== "all").map((tab) => {
                    const key = tab.toLowerCase();
                    const isActive = activeCategory === key;
                    const img = PREDEFINED_ICONS[key] || categoryImages[key] || "https://res.cloudinary.com/dcs0vuzwg/image/upload/v1778318368/emp_static4_q0ysjt.svg";
                    return (
                      <div 
                        key={tab} 
                        data-employee-category
                        data-active={isActive}
                        className="flex flex-col items-center gap-2 cursor-pointer group shrink-0 transition-transform duration-500"
                        onClick={() => handleCategoryChange(key)}
                        style={{ transform: isActive ? 'scale(1.1)' : 'scale(1)' }}
                      >
                        <div className={`w-[48px] h-[48px] md:w-[72px] md:h-[72px] rounded-[16px] md:rounded-[20px] overflow-hidden bg-gray-50 transition-all duration-500 shadow-sm ${isActive ? 'ring-4 ring-gray-100 scale-100' : 'group-hover:scale-105'}`}>
                          <img src={img} alt={tab} className="w-full h-full object-cover" />
                        </div>
                        <span className={`text-[11px] md:text-[12px] tracking-wide transition-all duration-500 ${isActive ? 'font-bold text-[#111827] scale-100' : 'font-medium text-gray-400 group-hover:text-gray-600 opacity-80'}`}>
                          {tab}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => handleCategoryChange("all")}
                  className="text-[13px] font-bold text-gray-900 mb-10 shrink-0 underline decoration-gray-200 underline-offset-8 hover:decoration-black transition-all"
                >
                  View all
                </button>
              </div>

              {/* Dropdown Filters - Always visible when sticky is shown */}
              <div className="flex flex-wrap items-center gap-3">
                <FilterDropdown
                  label="Size"
                  options={FILTER_OPTIONS.size}
                  selected={filters.size}
                  onChange={(selected) => updateFilter("size", selected)}
                />
                <FilterDropdown
                  label="Weight"
                  options={FILTER_OPTIONS.weight}
                  selected={filters.weight}
                  onChange={(selected) => updateFilter("weight", selected)}
                />
                <FilterDropdown
                  label="Availability"
                  options={FILTER_OPTIONS.availability}
                  selected={filters.availability}
                  onChange={(selected) => updateFilter("availability", selected)}
                />
                <FilterDropdown
                  label="Purity"
                  options={FILTER_OPTIONS.purity}
                  selected={filters.purity}
                  onChange={(selected) => updateFilter("purity", selected)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-8">

        {/* Grid */}
        {filteredProducts.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-gray-200 bg-gray-50 px-6 py-16 text-center">
            <p className="text-[14px] font-semibold text-gray-500">No products found.</p>
            <p className="text-[12px] text-gray-400 mt-2">
              Try adjusting your category or feature filters.
            </p>
          </div>
        ) : (
          <>
            <div data-employee-grid className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-12 gap-y-24">
              {currentProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={(p) => router.push(`/dashboard/employee/playground/review?productId=${p.id}`)}
                  onLongPress={handleLongPress}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-20 relative flex items-center justify-center w-full pb-8">
                {/* Centered Next Button */}
                <button
                  onClick={() => {
                    setCurrentPage(p => Math.min(totalPages, p + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={currentPage === totalPages}
                  className="px-10 py-3 bg-black text-white rounded-[12px] text-[14px] font-medium hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-[0_4px_14px_rgba(0,0,0,0.15)]"
                >
                  Next
                </button>

                {/* Right Aligned Page Numbers */}
                <div className="absolute right-0 hidden md:flex items-center gap-2 text-[14px] font-medium text-gray-400">
                  {[...Array(totalPages)].map((_, i) => {
                    const pageNumber = i + 1;

                    if (
                      pageNumber <= 4 ||
                      pageNumber === totalPages ||
                      (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => {
                            setCurrentPage(pageNumber);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={`transition-colors hover:text-gray-700 px-1 ${currentPage === pageNumber
                              ? "text-[#111827] font-extrabold"
                              : ""
                            }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    } else if (
                      pageNumber === 5 && totalPages > 6
                    ) {
                      return <span key={pageNumber} className="tracking-[0.2em] text-gray-300">.....</span>;
                    }
                    return null;
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Product Detail Modal */}
        <ProductInfoModal
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          product={selectedProduct}
          onStartChat={handleStartChat}
          isFullScreen={true}
        />


      </div>
    </div>
  );
}
