"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedImage from "../shared/ProtectedImage";

const ProductInfoModal = dynamic(
  () => import("./ProductInfoModal").then((mod) => mod.ProductInfoModal),
  { loading: () => null }
);

const VERTICAL_IMAGES = [
  "https://res.cloudinary.com/dcs0vuzwg/image/upload/v1778318369/emp_static1_ywv9ro.svg",
  "https://res.cloudinary.com/dcs0vuzwg/image/upload/v1778318368/emp_static2_vijtdd.svg",
  "https://res.cloudinary.com/dcs0vuzwg/image/upload/v1778318368/emp_static3_xdapmt.svg",
  "https://res.cloudinary.com/dcs0vuzwg/image/upload/v1778318368/emp_static4_q0ysjt.svg"
];

export default function DesignerCollectionSection({ employee, businessName, designs }) {
  const router = useRouter();
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    router.prefetch("/dashboard/employee/designs");
  }, [router]);

  // Use the randomly assigned image from the server, or fallback to the first one
  const verticalImage = employee?.assigned_bg_image || VERTICAL_IMAGES[0];

  // The designs are now pre-shuffled and sliced on the server to avoid hydration errors
  const shuffledDesigns = designs || [];

  if (!shuffledDesigns || shuffledDesigns.length === 0) return null;

  return (
    <section data-employee-collection className={`w-full pt-16 pb-40 ${selectedProduct ? "bg-transparent" : "bg-white"}`}>
      <div className="w-full max-w-7xl mx-auto px-4 md:px-8">
        {/* Section Header */}
        <div data-employee-collection-heading className="mb-12 pl-4 md:pl-8 lg:pl-12">
          <h2 className="font-serif text-[32px] md:text-[40px] lg:text-[46px] text-[#111827] leading-tight mb-2 md:mb-3">
            Designer collection
          </h2>
          <p className="text-[14px] md:text-[16px] lg:text-[18px] text-gray-400 font-light">
            Crafted in house with the taste of the our own
          </p>
        </div>

      {/* Main Layout: left grid + right dynamic tall image */}
      <div className="flex flex-col lg:flex-row gap-8 items-stretch">

        {/* LEFT: 2-column grid — only actual designs */}
        <div data-employee-grid className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-12 md:gap-y-16">
          {shuffledDesigns.map((design) => (
            <div 
              key={design.id} 
              data-employee-product-card
              className="flex flex-col cursor-pointer group/card"
              onClick={() => setSelectedProduct(design)}
            >
              {/* Image Container */}
              <div className="w-full bg-[#f8f8f8] p-0 flex items-center justify-center overflow-hidden" style={{ aspectRatio: "5/4" }}>
                <ProtectedImage
                  src={design.image_url}
                  alt={design.title || "Untitled design"}
                  className="w-full h-full object-contain mix-blend-multiply shadow-sm transition-transform group-hover/card:scale-105 duration-700"
                />
              </div>
              {/* Label */}
              <span data-employee-product-title className="text-[13px] font-serif text-gray-700 text-center mt-4 tracking-wide line-clamp-1 px-2">
                {design.title || "Untitled design"}
              </span>
            </div>
          ))}
        </div>

        {/* RIGHT: Super tall vertical image — hidden on mobile & portrait */}
        <div
          data-employee-collection-art
          className="hidden lg:block shrink-0 overflow-hidden relative shadow-2xl"
          style={{ width: "28%" }}
        >
          <img
            src={verticalImage}
            alt="Featured collection"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Subtle overlay to enhance premium feel */}
          <div className="absolute inset-0 bg-black/5" />
        </div>

      </div>

      {/* View All */}
      <div className="flex justify-center mt-12">
        <button
          data-sarvam-action="secondary"
          onClick={() => router.push('/dashboard/employee/designs')}
          className="text-[11px] tracking-[0.25em] text-gray-500 underline underline-offset-8 decoration-gray-300 hover:text-black hover:decoration-black transition-all uppercase font-semibold"
        >
          view all
        </button>
      </div>

      {/* Product Detail Modal */}
      <ProductInfoModal 
        isOpen={!!selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
        product={selectedProduct} 
        isFullScreen={true}
      />
      </div>
    </section>
  );
}
