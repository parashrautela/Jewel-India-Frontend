"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedImage from "../shared/ProtectedImage";
import FullImageViewer from "../shared/FullImageViewer";
import { useTheme } from "@/context/ThemeContext";

export default function SelectionReviewClient() {
  const router = useRouter();
  const { theme } = useTheme();
  const isMaharaja = theme === "maharaja";

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({});
  const [viewingProduct, setViewingProduct] = useState(null);
  const [activeImage, setActiveImage] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [individualFormData, setIndividualFormData] = useState({ quantity: 1, customization_notes: "" });

  const [isFullViewOpen, setIsFullViewOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    router.prefetch("/dashboard/employee");
    router.prefetch("/dashboard/employee/orders");
  }, [router]);

  const handleViewProduct = (product) => {
    setViewingProduct(product);
    if (product) {
      const defaultImg = product.generated_image_urls?.[0] || product.processed_image_url || product.raw_image_url;
      setActiveImage(defaultImg);
      setActiveImageIndex(0);
    } else {
      setActiveImage(null);
      setActiveImageIndex(0);
    }
  };

  useEffect(() => {
    const fetchProducts = async () => {
      let urlProductId = null;
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        urlProductId = params.get("productId");
      }

      const stored = sessionStorage.getItem('employee_selected_products');
      let ids = [];
      if (stored) {
        try {
          ids = JSON.parse(stored);
        } catch (e) {
          // TODO: add proper error handling
        }
      }

      const originalStoredSet = new Set(ids);

      // If productId is in URL and not in stored ids, fetch it too
      if (urlProductId && !originalStoredSet.has(urlProductId)) {
        ids.push(urlProductId);
      }

      if (ids.length === 0) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/products/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids })
        });

        const json = await res.json();
        if (json.data) {
          // Only show original stored products in the review grid
          const gridProducts = json.data.filter(p => originalStoredSet.has(p.id));
          setProducts(gridProducts);

          // Find the product specified in the URL to show in detail view
          const detailProduct = json.data.find(p => p.id === urlProductId);
          if (detailProduct) {
            handleViewProduct(detailProduct);
          }

          // Init form data for all fetched products
          const initialForm = {};
          json.data.forEach(p => {
            initialForm[p.id] = { quantity: 1, customization_notes: "" };
          });
          setFormData(initialForm);
        }
      } catch (err) {
        // TODO: add proper error handling
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleUpdateField = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  const handleRemove = (id) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    setFormData(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    // update session storage
    const stored = JSON.parse(sessionStorage.getItem('employee_selected_products') || "[]");
    sessionStorage.setItem('employee_selected_products', JSON.stringify(stored.filter(x => x !== id)));
  };

  const handleSubmit = async () => {
    if (products.length === 0) return;
    setIsSubmitting(true);

    const items = products.map(p => ({
      product_id: p.id,
      wholesaler_id: p.wholesaler_id,
      quantity: 1,
      customization_notes: ""
    }));

    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit request");

      // Success
      sessionStorage.removeItem('employee_selected_products');
      setSuccess(true);

      // Auto redirect after a few seconds
      setTimeout(() => {
        router.push('/dashboard/employee');
      }, 4000);

    } catch (err) {
      alert(err.message);
      setIsSubmitting(false);
    }
  };

  const handleIndividualSubmit = async (product) => {
    setIsSubmitting(true);
    const items = [{
      product_id: product.id,
      wholesaler_id: product.wholesaler_id,
      quantity: individualFormData.quantity,
      customization_notes: individualFormData.customization_notes
    }];

    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit request");

      setSuccess(true);

      setTimeout(() => {
        setSuccess(false);
        setIsSidebarOpen(false);
        handleViewProduct(null);
        handleRemove(product.id);
      }, 2000);

    } catch (err) {
      alert(err.message);
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex-1 w-full min-h-[80vh] flex flex-col items-center justify-center bg-white px-4 animate-fade-in-up">
        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h1 className="text-[32px] font-extrabold text-[#111827] mb-2 tracking-tight text-center">
          Request Sent Successfully!
        </h1>
        <p className="text-[#6B7280] text-[15px] mb-8 text-center max-w-md">
          Your production requests have been forwarded to the respective wholesalers. You can track them in your Orders tab.
        </p>
        <Link
          href="/dashboard/employee"
          className="bg-black text-white px-8 py-3 rounded-[10px] font-bold text-[14px] hover:bg-gray-800 transition-colors shadow-lg"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${viewingProduct ? "bg-transparent" : "bg-white"}`}>

      {/* Header */}
      <div className="flex items-center justify-between px-6 md:px-12 py-8 relative max-w-[1400px] mx-auto">
        <button
          onClick={() => {
            if (viewingProduct) handleViewProduct(null);
            else router.back();
          }}
          className="w-12 h-12 rounded-full bg-gradient-to-b from-gray-50 to-gray-200 flex items-center justify-center text-gray-500 hover:text-black transition-colors shadow-sm border border-gray-300 absolute left-6 md:left-12 z-10"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>

        <h1 className="text-[38px] font-serif tracking-wide text-[#1A1A1A] w-full text-center">
          Selected Items
        </h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-32">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-black border-t-transparent"></div>
        </div>
      ) : viewingProduct ? (
        <>
        {/* White Background layer behind pillars */}
          <div 
            data-employee-fullscreen
            data-employee-detail-base
            style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", overflow: "hidden" }} 
            className="bg-white z-[58] pointer-events-none" 
          />

          {/* Arch Background image container */}
          <div 
            data-employee-fullscreen
            data-employee-ornament
            style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", overflow: "hidden" }} 
            className="z-[59] pointer-events-none"
          >
            {isMaharaja ? (
              <img 
                src="https://res.cloudinary.com/dcs0vuzwg/image/upload/v1781085326/Maharaja_theme_infoPage_zslwde.svg" 
                alt="Arch Background" 
                style={{ width: "100%", height: "100%", objectFit: "cover" }} 
              />
            ) : (
              <>
                {/* Landscape: use landscape SVG with cover — already perfect */}
                <div
                  role="img"
                  aria-label="Arch Background"
                  className="hidden landscape:block"
                  style={{
                    width: "100%",
                    height: "100%",
                    backgroundImage: "url('https://res.cloudinary.com/dcs0vuzwg/image/upload/v1781118947/theme1_horizontal_hog6yy.svg')",
                    backgroundSize: "cover",
                    backgroundPosition: "center top",
                    backgroundRepeat: "no-repeat",
                  }}
                />
                {/* Portrait: use portrait SVG stretched to fill entire viewport — 
                    pillars edge-to-edge, arch top-to-bottom, zero white gaps */}
                <div
                  role="img"
                  aria-label="Arch Background"
                  className="block landscape:hidden"
                  style={{
                    width: "100%",
                    height: "100%",
                    backgroundImage: "url('https://res.cloudinary.com/dcs0vuzwg/image/upload/v1781118947/theme1_vertical_sclwlj.svg')",
                    backgroundSize: "100% 100%",
                    backgroundPosition: "center top",
                    backgroundRepeat: "no-repeat",
                  }}
                />
              </>
            )}
          </div>

          <div data-employee-fullscreen className="fixed inset-0 overflow-y-auto z-[60] flex flex-col items-center pb-24 font-sans select-none bg-transparent">

          {/* Glassmorphic back button */}
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                const params = new URLSearchParams(window.location.search);
                if (params.has("productId")) {
                  router.back();
                  return;
                }
              }
              handleViewProduct(null);
            }}
            className="absolute top-10 left-10 w-12 h-12 rounded-full border-[0.436px] border-[#696969] flex items-center justify-center text-black hover:opacity-80 active:scale-95 transition-all shadow-[0px_2.182px_3.382px_0px_rgba(0,0,0,0.25),inset_-1.091px_-1.091px_2.291px_0px_rgba(0,0,0,0.25),inset_2.182px_2.182px_4.691px_0px_rgba(255,255,255,0.25)] z-50"
            style={{
              backdropFilter: "blur(12.5px)",
              WebkitBackdropFilter: "blur(12.5px)",
              backgroundImage: "linear-gradient(155.556deg, rgba(255, 255, 255, 0.43) 17.827%, rgba(224, 224, 224, 0.43) 90.412%)"
            }}
            aria-label="Go back"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>

          {/* Main content wrapper centered inside the arch */}
          <div 
            data-employee-detail-content
            className="relative w-full max-w-[400px] sm:max-w-[500px] md:max-w-[600px] lg:max-w-[700px] flex flex-col items-center"
            style={{ 
              paddingTop: "clamp(90px, 10vw, 115px)", 
              paddingBottom: "clamp(20px, 5vw, 40px)", 
              paddingLeft: "clamp(20px, 5vw, 40px)", 
              paddingRight: "clamp(20px, 5vw, 40px)" 
            }}
          >

            {/* Header section — centered, sits inside the white arch opening visually */}
            <div data-employee-detail-heading className="flex flex-col items-center text-center mb-10 w-full">
              <div className="flex items-center justify-center gap-3 mb-3">
                <span 
                  className="font-bold uppercase tracking-[0.2em] text-[#6e6e6e] font-sans"
                  style={{ fontSize: "clamp(12px, 1.8vw, 16px)" }}
                >
                  {viewingProduct.category || "NECKLACE"}
                </span>
                <div className="border border-[#a8a8a8] rounded-[6px] py-[4px] px-[8px] flex items-center justify-center">
                  <span 
                    className="tracking-[0.02em] font-medium font-sans text-[#515151]"
                    style={{ fontSize: "clamp(10px, 1.5vw, 12px)" }}
                  >
                    {viewingProduct.style_aesthetic || viewingProduct.style || "Traditional"}
                  </span>
                </div>
              </div>
              <h1 
                className="font-serif text-black leading-[1.2] tracking-wide" 
                style={{ fontFamily: "var(--font-gilda)", fontSize: "clamp(24px, 4vw, 38px)" }}
              >
                {viewingProduct.title || "Vintage Cuff half necklace"}
              </h1>
            </div>

            {/* Image section — main image and thumbnails side by side */}
            {(() => {
              let allImages = Array.from(new Set([
                ...(viewingProduct.generated_image_urls || []),
                viewingProduct.processed_image_url
              ].filter(Boolean)));

              if (allImages.length === 0 && viewingProduct.raw_image_url) {
                allImages.push(viewingProduct.raw_image_url);
              }

              allImages = allImages.slice(0, 4);

              return (
                <div data-employee-detail-images className="flex items-start justify-center gap-4 sm:gap-6 mb-12 relative w-full">

                  {/* Main image container */}
                  <div
                    onClick={() => setIsFullViewOpen(true)}
                    className="w-full max-w-[240px] sm:max-w-[280px] md:max-w-[320px] aspect-[3/4] bg-[#f5f5f5] rounded-sm overflow-hidden relative cursor-pointer shadow-sm flex items-center justify-center border border-gray-100/60"
                  >
                    {activeImage ? (
                      <ProtectedImage src={activeImage} className="w-full h-full object-contain mix-blend-multiply" />
                    ) : (
                      <span className="text-gray-300 font-light text-sm">No image</span>
                    )}

                    {/* Glassmorphic zoom/fullscreen button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsFullViewOpen(true);
                      }}
                      className="absolute right-3 bottom-3 w-[40px] h-[40px] sm:w-[48px] sm:h-[48px] rounded-full border-[#696969] border-[0.436px] flex items-center justify-center text-black hover:opacity-85 transition-opacity shadow-[0px_2.182px_3.382px_0px_rgba(0,0,0,0.25),inset_-1.091px_-1.091px_2.291px_0px_rgba(0,0,0,0.25),inset_2.182px_2.182px_4.691px_0px_rgba(255,255,255,0.25)] z-20"
                      style={{
                        backdropFilter: "blur(12.55px)",
                        WebkitBackdropFilter: "blur(12.55px)",
                        backgroundImage: "linear-gradient(155.556deg, rgba(255, 255, 255, 0.43) 17.827%, rgba(224, 224, 224, 0.43) 90.412%)"
                      }}
                      aria-label="Zoom image"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* Vertical Thumbnails strip */}
                  <div className="flex flex-col gap-2 shrink-0">
                    {allImages.map((imgSrc, idx) => {
                      const isActive = imgSrc === activeImage;
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            setActiveImage(imgSrc);
                            setActiveImageIndex(idx);
                          }}
                          className={`w-[45px] h-[45px] sm:w-[55px] sm:h-[55px] overflow-hidden transition-all bg-white relative rounded-sm ${isActive ? "border-2 border-white ring-1 ring-black/10 scale-[1.02] shadow-md z-10" : "border border-gray-200/80 opacity-60 hover:opacity-90"
                            }`}
                        >
                          <ProtectedImage src={imgSrc} className="w-full h-full object-contain mix-blend-multiply" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Specifications section */}
            <div data-employee-detail-specs className="w-full grid grid-cols-1 sm:grid-cols-[210px_210px] md:grid-cols-[250px_250px] lg:grid-cols-[290px_290px] justify-between gap-y-8 mt-4">

              {/* Left Column: MATERIAL & WEIGHT */}
              <div className="flex flex-col gap-6">
                {/* MATERIAL */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-bold text-black uppercase tracking-[0.2em] font-sans" style={{ fontSize: "clamp(10px, 1.5vw, 12px)" }}>MATERIAL</span>
                    <div className="flex-grow border-t border-dashed border-[#a8a8a8]" />
                  </div>
                  <div className="flex justify-between text-gray-800 font-sans px-1">
                    <span className="text-[#6e6e6e] font-medium" style={{ fontSize: "clamp(13px, 1.8vw, 15px)" }}>Gold</span>
                    <span className="text-black font-semibold" style={{ fontSize: "clamp(13px, 1.8vw, 15px)" }}>{viewingProduct.metal_purity || viewingProduct.purity || "22k"}</span>
                  </div>
                </div>

                {/* WEIGHT */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-bold text-black uppercase tracking-[0.2em] font-sans" style={{ fontSize: "clamp(10px, 1.5vw, 12px)" }}>WEIGHT</span>
                    <div className="flex-grow border-t border-dashed border-[#a8a8a8]" />
                  </div>
                  <div className="flex flex-col gap-2 px-1">
                    <div className="flex justify-between font-sans">
                      <span className="text-[#6e6e6e] font-medium" style={{ fontSize: "clamp(13px, 1.8vw, 15px)" }}>Net weight</span>
                      <span className="text-black font-semibold" style={{ fontSize: "clamp(13px, 1.8vw, 15px)" }}>
                        {viewingProduct.net_weight ? `${viewingProduct.net_weight}g` : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between font-sans">
                      <span className="text-[#6e6e6e] font-medium" style={{ fontSize: "clamp(13px, 1.8vw, 15px)" }}>Gross weight</span>
                      <span className="text-black font-semibold" style={{ fontSize: "clamp(13px, 1.8vw, 15px)" }}>
                        {viewingProduct.gross_weight ? `${viewingProduct.gross_weight}g` : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between font-sans">
                      <span className="text-[#6e6e6e] font-medium" style={{ fontSize: "clamp(13px, 1.8vw, 15px)" }}>Stone weight</span>
                      <span className="text-black font-semibold" style={{ fontSize: "clamp(13px, 1.8vw, 15px)" }}>
                        {viewingProduct.stone_weight ? `${viewingProduct.stone_weight}g` : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: AVAILABILITY & CTAs */}
              <div className="flex flex-col gap-6">
                {/* AVAILABILITY */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-bold text-black uppercase tracking-[0.2em] font-sans" style={{ fontSize: "clamp(10px, 1.5vw, 12px)" }}>AVAILABILITY</span>
                    <div className="flex-grow border-t border-dashed border-[#a8a8a8]" />
                  </div>
                  <div className="flex justify-between text-gray-800 font-sans px-1">
                    <span className="text-[#6e6e6e] font-medium" style={{ fontSize: "clamp(13px, 1.8vw, 15px)" }}>Made to order</span>
                    <span className="text-black font-semibold" style={{ fontSize: "clamp(13px, 1.8vw, 15px)" }}>
                      {viewingProduct.make_to_order_days || viewingProduct.production_time_days || "12 to 14"} days
                    </span>
                  </div>
                </div>

                {/* Actions / CTA Buttons */}
                <div className="flex flex-col items-center gap-4 mt-2">
                  <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="w-full bg-gradient-to-t from-black to-[#3c3c3c] hover:opacity-90 active:scale-[0.99] text-white font-sans font-bold tracking-widest text-[16px] py-4 rounded-[4px] shadow-[0px_2px_4px_rgba(0,0,0,0.25)] border border-black transition-all uppercase"
                  >
                    Send Request
                  </button>
                  <Link
                    href={`/dashboard/employee/messages?productId=${viewingProduct.id}`}
                    className="text-[16px] text-black hover:underline underline-offset-4 font-bold tracking-wide transition-colors text-center"
                    style={{ textShadow: "0px 1px 5px rgba(0,0,0,0.25)" }}
                  >
                    Chat with us
                  </Link>
                </div>
              </div>

            </div>

            {/* More you might like */}
            {products.filter(p => p.id !== viewingProduct.id).length > 0 && (
              <div className="mt-24 pt-12 border-t border-gray-200/50 w-full">
                <h2 className="text-[28px] font-serif text-gray-800 mb-8 text-center" style={{ fontFamily: "var(--font-gilda)" }}>
                  More, you might like from us
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {products.filter(p => p.id !== viewingProduct.id).slice(0, 6).map(product => {
                    const imgUrl = product.generated_image_urls?.[0] || product.processed_image_url || product.raw_image_url;
                    return (
                      <div
                        key={product.id}
                        className="flex flex-col cursor-pointer hover:opacity-95 transition-opacity bg-white border border-gray-100 shadow-sm"
                        onClick={() => handleViewProduct(product)}
                      >
                        <div className="w-full aspect-[4/3.5] bg-[#F5F6F8] flex items-center justify-center p-6 overflow-hidden">
                          {imgUrl ? (
                            <ProtectedImage src={imgUrl} className="w-full h-full object-contain mix-blend-multiply" />
                          ) : (
                            <span className="text-gray-400 font-serif text-sm">No Image</span>
                          )}
                        </div>
                        <div className="bg-[#FAFAFA] py-3 text-center border-t border-white">
                          <span className="font-serif text-[15px] text-gray-800 tracking-wide">
                            {product.title || product.jewellery_type || "Jewellery"}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

          </div>

          {/* Sidebar Overlay */}
          {isSidebarOpen && (
            <div data-employee-fullscreen className="fixed inset-0 z-[70] flex justify-end">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setIsSidebarOpen(false)}></div>
              <div className="relative w-full max-w-[420px] bg-white h-full shadow-2xl flex flex-col animate-slide-in-right z-10">

                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                  <h3 className="text-[14px] font-sans text-gray-800">Request this Design</h3>
                  <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-black">✕</button>
                </div>

                <div className="p-8 flex-1 overflow-y-auto flex flex-col gap-10">

                  {/* Product Snippet */}
                  <div className="flex gap-6">
                    <div className="flex-1">
                      <div className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mb-1.5">PRODUCT</div>
                      <div className="flex gap-2 mb-3">
                        <span className="text-[9px] uppercase border border-gray-200 px-2 py-0.5 text-gray-500 rounded-sm">Necklace</span>
                        <span className="text-[9px] uppercase text-gray-400 py-0.5">Traditional</span>
                      </div>
                      <h4 className="font-serif text-[20px] text-gray-900 leading-[1.2]">{viewingProduct.title || "Vintage Cuff half necklace"}</h4>
                    </div>
                    <div className="w-24 h-24 bg-[#343e4b] shrink-0 overflow-hidden">
                      <ProtectedImage src={activeImage} className="w-full h-full object-cover" />
                    </div>
                  </div>

                  {/* Quantity */}
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-4">QUANTITY</div>
                    <div className="flex items-center gap-5">
                      <button onClick={() => setIndividualFormData(p => ({ ...p, quantity: Math.max(1, p.quantity - 1) }))} className="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 text-lg transition-colors">-</button>
                      <span className="font-serif text-[20px] text-gray-800 w-4 text-center">{individualFormData.quantity}</span>
                      <button onClick={() => setIndividualFormData(p => ({ ...p, quantity: p.quantity + 1 }))} className="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 text-lg transition-colors">+</button>
                    </div>
                  </div>

                  {/* Customization */}
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-4">CUSTOMIZATION NEEDS</div>
                    <textarea
                      value={individualFormData.customization_notes}
                      onChange={e => setIndividualFormData(p => ({ ...p, customization_notes: e.target.value }))}
                      className="w-full h-32 bg-gray-50 border border-gray-100 rounded-[4px] p-5 text-[14px] text-gray-700 outline-none focus:ring-1 focus:ring-black/20 resize-none transition-shadow"
                      placeholder="Describe your customization requirements..."
                    ></textarea>
                  </div>
                </div>

                <div className="p-8 pt-4">
                  <button
                    onClick={() => handleIndividualSubmit(viewingProduct)}
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-b from-[#2a2a2a] to-[#000] text-white text-[12px] uppercase tracking-[0.15em] font-bold py-5 hover:bg-black transition-all shadow-xl disabled:opacity-70"
                  >
                    {isSubmitting ? "SENDING..." : "SEND REQUEST"}
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* Full Image Viewer Overlay */}
          {(() => {
            let allImages = Array.from(new Set([
              ...(viewingProduct.generated_image_urls || []),
              viewingProduct.processed_image_url
            ].filter(Boolean)));

            if (allImages.length === 0 && viewingProduct.raw_image_url) {
              allImages.push(viewingProduct.raw_image_url);
            }

            allImages = allImages.slice(0, 4);

            return (
              <FullImageViewer
                isOpen={isFullViewOpen}
                onClose={() => setIsFullViewOpen(false)}
                images={allImages}
                activeIndex={activeImageIndex}
                onChangeIndex={(idx) => {
                  setActiveImageIndex(idx);
                  if (allImages[idx]) {
                    setActiveImage(allImages[idx]);
                  }
                }}
              />
            );
          })()}

        </div>
      </>

      ) : products.length === 0 ? (
        <div className="text-center py-32">
          <p className="text-gray-500 font-serif text-[18px]">No products selected.</p>
          <button onClick={() => router.back()} className="text-blue-600 text-[14px] font-sans mt-4 underline underline-offset-4">
            Return to selection
          </button>
        </div>
      ) : (
        <div className="max-w-[1200px] mx-auto px-6 md:px-8 pb-32 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
            {products.map(product => {
              const imgUrl = product.generated_image_urls?.[0] || product.processed_image_url || product.raw_image_url;
              return (
                <div key={product.id} className="flex flex-col relative group cursor-pointer hover:opacity-95 transition-opacity" onClick={() => handleViewProduct(product)}>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemove(product.id); }}
                    className="absolute top-4 right-4 z-10 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                  >
                    ✕
                  </button>
                  <div className="w-full aspect-[4/3.5] bg-[#F5F6F8] flex items-center justify-center p-8 overflow-hidden">
                    {imgUrl ? (
                      <ProtectedImage src={imgUrl} alt={product.title} className="w-full h-full object-contain mix-blend-multiply pointer-events-none" />
                    ) : (
                      <span className="text-gray-400 font-serif text-sm">No Image</span>
                    )}
                  </div>
                  <div className="bg-[#FAFAFA] py-5 text-center border-t border-white">
                    <span className="font-serif text-[16px] text-gray-800 tracking-wide">
                      {product.title || product.jewellery_type || "Jewellery"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-20 flex justify-center">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-black text-white px-16 py-5 text-[14px] uppercase tracking-[0.2em] font-semibold hover:bg-gray-800 transition-all shadow-xl disabled:opacity-70 flex items-center gap-4"
            >
              {isSubmitting ? "Sending Request..." : "Confirm Request"}
              {!isSubmitting && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
