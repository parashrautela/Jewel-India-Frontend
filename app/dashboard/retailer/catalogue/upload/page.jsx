"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function UploadDesignPage() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [material, setMaterial] = useState("");
  const [styleAesthetic, setStyleAesthetic] = useState("");
  const [size, setSize] = useState("");
  const [purity, setPurity] = useState("");
  const [grossWeight, setGrossWeight] = useState("");
  const [stoneWeight, setStoneWeight] = useState("");
  const [netWeight, setNetWeight] = useState("");
  const [inStock, setInStock] = useState(false);
  const [productionTime, setProductionTime] = useState("");
  const [errors, setErrors] = useState({});

  const updateField = (key, setter, val) => {
    setter(val);
    if (errors[key]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    }
  };

  // Multiple images state
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const previewUrlsRef = useRef([]);

  // Cleanup all preview URLs on unmount
  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      const remainingSlots = 5 - files.length;
      const filesToAdd = newFiles.slice(0, remainingSlots);

      if (filesToAdd.length > 0) {
        setFiles(prev => [...prev, ...filesToAdd]);
        const newUrls = filesToAdd.map(file => URL.createObjectURL(file));
        previewUrlsRef.current = [...previewUrlsRef.current, ...newUrls];
        setPreviews(prev => [...prev, ...newUrls]);
        
        if (errors.images) {
          setErrors(prev => {
            const updated = { ...prev };
            delete updated.images;
            return updated;
          });
        }
      }
    }
    // Reset input so the same file can be selected again if needed
    e.target.value = null;
  };

  const removeFile = (indexToRemove) => {
    // Revoke the URL at the index being removed
    const urlToRemove = previewUrlsRef.current[indexToRemove];
    if (urlToRemove) {
      URL.revokeObjectURL(urlToRemove);
    }

    // Remove from ref array
    previewUrlsRef.current = previewUrlsRef.current.filter((_, idx) => idx !== indexToRemove);

    setFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
    setPreviews(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleAdd = async () => {
    const newErrors = {};

    if (files.length === 0) {
      newErrors.images = "At least one product image is required.";
    }
    if (!title || !title.trim()) {
      newErrors.title = "Product title is required.";
    }
    if (!category) {
      newErrors.category = "Please select a jewellery type.";
    }
    if (!material) {
      newErrors.material = "Please select a material category.";
    }
    if (!styleAesthetic) {
      newErrors.styleAesthetic = "Please select a style aesthetic.";
    }
    if (!size) {
      newErrors.size = "Please select a size.";
    }
    if (!purity) {
      newErrors.purity = "Please select a purity.";
    }

    const grossVal = parseFloat(grossWeight);
    if (!grossWeight || isNaN(grossVal) || grossVal <= 0) {
      newErrors.grossWeight = "Gross weight must be greater than 0.";
    }

    const stoneVal = parseFloat(stoneWeight);
    if (stoneWeight === "" || isNaN(stoneVal) || stoneVal < 0) {
      newErrors.stoneWeight = "Stone weight must be 0 or greater.";
    }

    const netVal = parseFloat(netWeight);
    if (!netWeight || isNaN(netVal) || netVal <= 0) {
      newErrors.netWeight = "Net weight must be greater than 0.";
    }

    if (!inStock) {
      const prodTime = parseInt(productionTime);
      if (!productionTime || isNaN(prodTime) || prodTime <= 0) {
        newErrors.productionTime = "Production time must be greater than 0 days.";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      
      const firstErrorKey = Object.keys(newErrors)[0];
      setTimeout(() => {
        const element = document.getElementById(firstErrorKey);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.focus();
        }
      }, 50);
      return;
    }

    setErrors({});
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append("images", file);
      });
      
      const tags = [material, category, styleAesthetic, size, purity].filter(Boolean);
      
      const payload = {
        title,
        type: category,
        category: material,
        style_aesthetic: styleAesthetic,
        size,
        purity,
        gross_weight: grossWeight,
        stone_weight: stoneWeight,
        net_weight: netWeight,
        is_in_stock: inStock,
        production_time_days: productionTime,
        is_archived: false,
        tags
      };
      
      formData.append("payload", JSON.stringify(payload));
      
      const res = await fetch("/api/designs/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) throw new Error("Upload failed");
      
      router.push("/dashboard/retailer/catalogue");
    } catch (err) {
      alert(err.message);
      setIsUploading(false);
    }
  };

  return (
    <>
      <style>{`
        aside { display: none !important; }
        main { margin-left: 0 !important; max-width: 100% !important; background: white !important; }
      `}</style>
      
      <div className="bg-white min-h-screen w-full relative pb-24 font-sans">
        <div className="absolute top-6 left-6 md:top-10 md:left-10 z-10">
          <Link 
            href="/dashboard/retailer"
            className="flex items-center gap-2 text-[14px] font-semibold text-[#4B5563] hover:text-[#111827] transition-colors"
          >
            <span>←</span> Back to dashboard
          </Link>
        </div>

        <div className="max-w-[846px] mx-auto pt-20 md:pt-[111px] px-4 md:px-0">
          <div className="text-center mb-[60px]">
            <h1 className="text-[40px] leading-[1.1] font-bold text-black">Add new product</h1>
            <p className="text-[18px] text-[#737373] mt-[16px]">Enter the details below to create a sparkling new listing.</p>
          </div>

          <div className="flex flex-col gap-16">
            {/* Section 1 */}
            <div className="flex flex-col md:flex-row gap-8 md:gap-[78px]">
              <div className="flex-1">
                <div className="flex items-start gap-[24px] mb-[16px]">
                  <div className="w-[28px] h-[28px] rounded-full bg-black text-white flex items-center justify-center text-[16px] shrink-0 mt-[6px]">1</div>
                  <h2 className="text-[32px] leading-[1.25] font-semibold text-black">Product image</h2>
                </div>
                <p className="text-[16px] leading-[24px] tracking-[0.32px] text-[#7d746d] mb-[22px] pl-[52px] max-w-[383px]">
                  Upload a clear image. We&apos;ll remove the background first, then enhance it.
                </p>
                
                <h3 className="text-[16px] leading-[24px] tracking-[0.32px] font-semibold text-black mb-[12px] pl-[52px]">Get the best result from your photo</h3>
                <ol className="text-[16px] leading-[24px] tracking-[0.32px] text-[#7d746d] space-y-[8px] list-decimal pl-[76px] max-w-[407px]">
                  <li className="pl-1">Place the jewellery on a background that contrasts with the product.</li>
                  <li className="pl-1">You can add multiple image with max 5*</li>
                  <li className="pl-1">Keep only the product in the frame</li>
                </ol>
              </div>
              
              <div className="w-full md:w-[384px] shrink-0">
                <div className="flex flex-wrap gap-3">
                  {previews.map((preview, idx) => (
                    <div key={idx} className="relative w-[100px] h-[100px] rounded-[12px] border border-gray-200 overflow-hidden group shrink-0">
                      <Image
                        src={preview}
                        alt={`Preview ${idx + 1}`}
                        fill
                        loading="lazy"
                        unoptimized
                        className="w-full h-full object-cover"
                      />
                      <button 
                        onClick={() => removeFile(idx)}
                        className="absolute top-1 right-1 w-6 h-6 bg-white/80 rounded-full flex items-center justify-center text-red-500 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm shadow-sm"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>
                  ))}
                  
                  {previews.length === 0 ? (
                    <label className={`flex flex-col items-center justify-center w-full aspect-[384/249] md:h-[249px] border-2 border-dashed rounded-[8px] cursor-pointer transition-colors ${
                      errors.images
                        ? "border-red-400 bg-red-50 hover:bg-red-50/70"
                        : "border-[#1974cf] bg-[#e6f3ff] hover:bg-[#d9ecff]"
                    }`} id="images">
                      <input type="file" multiple className="hidden" accept="image/*" onChange={handleFileChange} />
                      <img src="/retailer-admin/upload-plus.svg" alt="Add photos" width={68} height={68} />
                      {errors.images && (
                        <p className="text-[12px] font-semibold text-red-500 mt-2">{errors.images}</p>
                      )}
                    </label>
                  ) : previews.length < 5 ? (
                    <label className="flex flex-col items-center justify-center w-[100px] h-[100px] border-2 border-dashed border-[#93C5FD] bg-[#EFF6FF] rounded-[12px] cursor-pointer hover:bg-blue-50 transition-colors shrink-0">
                      <input type="file" multiple className="hidden" accept="image/*" onChange={handleFileChange} />
                      <div className="w-8 h-8 rounded-full border-2 border-[#3B82F6] flex items-center justify-center text-[#3B82F6]">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                      </div>
                    </label>
                  ) : null}

                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div className="flex flex-col gap-[32px] md:grid md:grid-cols-[384px_384px] md:gap-x-[78px]">
              <div>
                <div className="flex items-start gap-[24px] mb-[16px]">
                  <div className="w-[28px] h-[28px] rounded-full bg-black text-white flex items-center justify-center text-[16px] shrink-0 mt-[6px]">2</div>
                  <h2 className="text-[32px] leading-[1.25] font-semibold text-black whitespace-nowrap">Essential Details</h2>
                </div>
                <p className="text-[16px] leading-[24px] tracking-[0.32px] text-[#7d746d] pl-[52px] max-w-[383px]">
                  Add the key information that helps retailers understand and find this piece.
                </p>
              </div>

              <div className="contents">
                <div className="flex flex-col gap-[12px] md:pt-[6px]">
                  <label className="text-[16px] font-semibold text-[#46403b]">Product Title</label>
                  <input
                    type="text"
                    id="title"
                    placeholder="eg. Vintage gold Necklace"
                    value={title}
                    onChange={(e) => updateField("title", setTitle, e.target.value)}
                    className={`w-full h-[56px] rounded-[8px] px-[21px] text-[16px] font-semibold text-[#1b1917] placeholder-[#a8a19c] outline-none transition-colors border ${
                      errors.title
                        ? "bg-red-50 border-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-400"
                        : "bg-[#fafafa] border-[#ededed] focus:border-[#a8a19c]"
                    }`}
                  />
                  {errors.title && (
                    <p className="text-[11px] font-semibold text-red-500 mt-0.5 animate-fade-in">{errors.title}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px] md:col-span-2 md:w-[792px]">
                  <div className="flex flex-col gap-[12px]">
                    <label className="text-[16px] font-semibold text-[#46403b]">Type</label>
                    <div className="relative">
                      <select
                        id="category"
                        value={category}
                        onChange={(e) => updateField("category", setCategory, e.target.value)}
                        className={`w-full h-[56px] rounded-[8px] px-[21px] pr-[52px] text-[16px] font-semibold text-[#1b1917] placeholder-[#a8a19c] outline-none transition-colors border appearance-none ${
                          errors.category
                            ? "bg-red-50 border-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-400"
                            : "bg-white border-[#ededed] focus:border-[#a8a19c]"
                        }`}
                      >
                        <option value="" disabled hidden>select</option>
                        <option value="Necklace">Necklace</option>
                        <option value="Earrings">Earrings</option>
                        <option value="Ring">Ring</option>
                        <option value="Haram">Haram</option>
                        <option value="Pendants">Pendants</option>
                        <option value="Mangalsutras">Mangalsutras</option>
                        <option value="Chains">Chains</option>
                        <option value="Bangles">Bangles</option>
                        <option value="Nosepin">Nosepin</option>
                      </select>
                      <div className="absolute right-[17px] top-1/2 -translate-y-1/2 pointer-events-none">
                        <img src="/retailer-admin/chevron-down.svg" alt="" width={24} height={24} />
                      </div>
                    </div>
                    {errors.category && (
                      <p className="text-[11px] font-semibold text-red-500 mt-0.5 animate-fade-in">{errors.category}</p>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-[12px]">
                    <label className="text-[16px] font-semibold text-[#46403b]">Material category</label>
                    <div className="relative">
                      <select
                        id="material"
                        value={material}
                        onChange={(e) => updateField("material", setMaterial, e.target.value)}
                        className={`w-full h-[56px] rounded-[8px] px-[21px] pr-[52px] text-[16px] font-semibold text-[#1b1917] placeholder-[#a8a19c] outline-none transition-colors border appearance-none ${
                          errors.material
                            ? "bg-red-50 border-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-400"
                            : "bg-white border-[#ededed] focus:border-[#a8a19c]"
                        }`}
                      >
                        <option value="" disabled hidden>select</option>
                        <option value="Gold">Gold</option>
                        <option value="Silver">Silver</option>
                        <option value="Platinum">Platinum</option>
                        <option value="Diamond">Diamond</option>
                      </select>
                      <div className="absolute right-[17px] top-1/2 -translate-y-1/2 pointer-events-none">
                        <img src="/retailer-admin/chevron-down.svg" alt="" width={24} height={24} />
                      </div>
                    </div>
                    {errors.material && (
                      <p className="text-[11px] font-semibold text-red-500 mt-0.5 animate-fade-in">{errors.material}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[384px_180px_180px] gap-[24px] md:col-span-2">
                  <div className="flex flex-col gap-[12px]">
                    <label className="text-[16px] font-semibold text-[#46403b]">Style Aesthetic</label>
                    <div className="relative">
                      <select
                        id="styleAesthetic"
                        value={styleAesthetic}
                        onChange={(e) => updateField("styleAesthetic", setStyleAesthetic, e.target.value)}
                        className={`w-full h-[56px] rounded-[8px] px-[21px] pr-[52px] text-[16px] font-semibold text-[#1b1917] placeholder-[#a8a19c] outline-none transition-colors border appearance-none ${
                          errors.styleAesthetic
                            ? "bg-red-50 border-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-400"
                            : "bg-white border-[#ededed] focus:border-[#a8a19c]"
                        }`}
                      >
                        <option value="" disabled hidden>select</option>
                        <option value="Vintage">Vintage</option>
                        <option value="Modern">Modern</option>
                        <option value="Classic">Classic</option>
                        <option value="Minimal">Minimal</option>
                      </select>
                      <div className="absolute right-[17px] top-1/2 -translate-y-1/2 pointer-events-none">
                        <img src="/retailer-admin/chevron-down.svg" alt="" width={24} height={24} />
                      </div>
                    </div>
                    {errors.styleAesthetic && (
                      <p className="text-[11px] font-semibold text-red-500 mt-0.5 animate-fade-in">{errors.styleAesthetic}</p>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-[12px]">
                    <label className="text-[16px] font-semibold text-[#46403b]">Size</label>
                    <div className="relative">
                      <select
                        id="size"
                        value={size}
                        onChange={(e) => updateField("size", setSize, e.target.value)}
                        className={`w-full h-[56px] rounded-[8px] px-[21px] pr-[52px] text-[16px] font-semibold text-[#1b1917] placeholder-[#a8a19c] outline-none transition-colors border appearance-none ${
                          errors.size
                            ? "bg-red-50 border-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-400"
                            : "bg-white border-[#ededed] focus:border-[#a8a19c]"
                        }`}
                      >
                        <option value="" disabled hidden>select</option>
                        <option value="Small">Small</option>
                        <option value="Medium">Medium</option>
                        <option value="Large">Large</option>
                        <option value="Adjustable">Adjustable</option>
                      </select>
                      <div className="absolute right-[17px] top-1/2 -translate-y-1/2 pointer-events-none">
                        <img src="/retailer-admin/chevron-down.svg" alt="" width={24} height={24} />
                      </div>
                    </div>
                    {errors.size && (
                      <p className="text-[11px] font-semibold text-red-500 mt-0.5 animate-fade-in">{errors.size}</p>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-[12px]">
                    <label className="text-[16px] font-semibold text-[#46403b]">Purity</label>
                    <div className="relative">
                      <select
                        id="purity"
                        value={purity}
                        onChange={(e) => updateField("purity", setPurity, e.target.value)}
                        className={`w-full h-[56px] rounded-[8px] px-[21px] pr-[52px] text-[16px] font-semibold text-[#1b1917] placeholder-[#a8a19c] outline-none transition-colors border appearance-none ${
                          errors.purity
                            ? "bg-red-50 border-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-400"
                            : "bg-white border-[#ededed] focus:border-[#a8a19c]"
                        }`}
                      >
                        <option value="" disabled hidden>select</option>
                        <option value="18K">18K</option>
                        <option value="22K">22K</option>
                        <option value="24K">24K</option>
                        <option value="925 Sterling">925 Sterling</option>
                      </select>
                      <div className="absolute right-[17px] top-1/2 -translate-y-1/2 pointer-events-none">
                        <img src="/retailer-admin/chevron-down.svg" alt="" width={24} height={24} />
                      </div>
                    </div>
                    {errors.purity && (
                      <p className="text-[11px] font-semibold text-red-500 mt-0.5 animate-fade-in">{errors.purity}</p>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Section 3 */}
            <div>
              <div className="flex items-start gap-[24px] mb-[16px]">
                <div className="w-[28px] h-[28px] rounded-full bg-black text-white flex items-center justify-center text-[16px] shrink-0 mt-[6px]">3</div>
                <h2 className="text-[32px] leading-[1.25] font-semibold text-black">Specifications</h2>
              </div>
              <p className="text-[16px] leading-[24px] tracking-[0.32px] text-[#7d746d] mb-[32px] pl-[52px] max-w-[383px]">
                Add weight and stone details so retailers know exactly what they&apos;re getting.
              </p>

              <div className="flex flex-col gap-[32px] md:pl-[54px] md:max-w-[642px]">
                <div className="grid grid-cols-1 md:grid-cols-[180px_180px_180px] gap-[24px]">
                  <div className="flex flex-col gap-[12px]">
                    <label className="text-[16px] font-semibold text-[#46403b]">Gross weight</label>
                    <div className="relative">
                      <input
                        type="number"
                        id="grossWeight"
                        placeholder="0.0"
                        value={grossWeight}
                        onChange={(e) => updateField("grossWeight", setGrossWeight, e.target.value)}
                        className={`w-full h-[48px] rounded-[8px] pl-4 pr-8 text-[14px] text-[#111827] outline-none transition-colors border ${
                          errors.grossWeight
                            ? "bg-red-50 border-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-400"
                            : "bg-white border-[#ededed] focus:border-[#a8a19c]"
                        }`}
                      />
                      <span className="absolute right-0 top-0 h-full w-[54px] flex items-center justify-center border-l border-[#ededed] text-[16px] font-semibold text-[#a8a19c] pointer-events-none">g</span>
                    </div>
                    {errors.grossWeight && (
                      <p className="text-[11px] font-semibold text-red-500 mt-0.5 animate-fade-in">{errors.grossWeight}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-[12px]">
                    <label className="text-[16px] font-semibold text-[#46403b]">Stone weight</label>
                    <div className="relative">
                      <input
                        type="number"
                        id="stoneWeight"
                        placeholder="0.0"
                        value={stoneWeight}
                        onChange={(e) => updateField("stoneWeight", setStoneWeight, e.target.value)}
                        className={`w-full h-[48px] rounded-[8px] pl-4 pr-8 text-[14px] text-[#111827] outline-none transition-colors border ${
                          errors.stoneWeight
                            ? "bg-red-50 border-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-400"
                            : "bg-white border-[#ededed] focus:border-[#a8a19c]"
                        }`}
                      />
                      <span className="absolute right-0 top-0 h-full w-[54px] flex items-center justify-center border-l border-[#ededed] text-[16px] font-semibold text-[#a8a19c] pointer-events-none">g</span>
                    </div>
                    {errors.stoneWeight && (
                      <p className="text-[11px] font-semibold text-red-500 mt-0.5 animate-fade-in">{errors.stoneWeight}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-[12px]">
                    <label className="text-[16px] font-semibold text-[#46403b]">Net Weight</label>
                    <div className="relative">
                      <input
                        type="number"
                        id="netWeight"
                        placeholder="0.0"
                        value={netWeight}
                        onChange={(e) => updateField("netWeight", setNetWeight, e.target.value)}
                        className={`w-full h-[48px] rounded-[8px] pl-4 pr-8 text-[14px] text-[#111827] outline-none transition-colors border ${
                          errors.netWeight
                            ? "bg-red-50 border-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-400"
                            : "bg-white border-[#ededed] focus:border-[#a8a19c]"
                        }`}
                      />
                      <span className="absolute right-0 top-0 h-full w-[54px] flex items-center justify-center border-l border-[#ededed] text-[16px] font-semibold text-[#a8a19c] pointer-events-none">g</span>
                    </div>
                    {errors.netWeight && (
                      <p className="text-[11px] font-semibold text-red-500 mt-0.5 animate-fade-in">{errors.netWeight}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-[16px] font-semibold text-black">Available in Stock</span>
                    <span className="text-[16px] leading-[24px] tracking-[0.32px] text-[#7d746d]">Is this piece ready to ship right away?</span>
                  </div>
                  <div 
                    onClick={() => {
                      const nextInStock = !inStock;
                      setInStock(nextInStock);
                      if (nextInStock && errors.productionTime) {
                        setErrors(prev => {
                          const updated = { ...prev };
                          delete updated.productionTime;
                          return updated;
                        });
                      }
                    }}
                    className={`w-[51px] h-[31px] flex items-center rounded-[100px] p-[2px] cursor-pointer transition-colors duration-200 ${inStock ? "bg-[#34c759]" : "bg-[rgba(120,120,128,0.16)]"}`}
                  >
                    <div 
                      className={`bg-white w-[27px] h-[27px] rounded-full shadow-[0_3px_8px_rgba(0,0,0,0.15),0_3px_1px_rgba(0,0,0,0.06)] transform transition-transform duration-200 ${inStock ? "translate-x-[20px]" : "translate-x-0"}`} 
                    />
                  </div>
                </div>

                {!inStock && (
                  <div className="flex flex-col gap-1.5 w-full md:w-[320px] animate-fade-in">
                    <label className="text-[16px] font-semibold text-[#46403b]">Production time</label>
                    <div className="relative">
                      <input
                        type="number"
                        id="productionTime"
                        placeholder="eg. 14"
                        value={productionTime}
                        onChange={(e) => updateField("productionTime", setProductionTime, e.target.value)}
                        className={`w-full h-[48px] rounded-[8px] pl-4 pr-12 text-[14px] text-[#111827] outline-none transition-colors border ${
                          errors.productionTime
                            ? "bg-red-50 border-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-400"
                            : "bg-white border-[#ededed] focus:border-[#a8a19c]"
                        }`}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-[#9CA3AF] pointer-events-none">days</span>
                    </div>
                    {errors.productionTime && (
                      <p className="text-[11px] font-semibold text-red-500 mt-0.5 animate-fade-in">{errors.productionTime}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions & Footer */}
            <div className="flex flex-col gap-16 mt-8">
              <div className="flex justify-end pt-8 border-t border-gray-100">
                <button
                  onClick={handleAdd}
                  disabled={isUploading}
                  className="bg-black text-white rounded-[10px] h-[48px] px-10 text-[16px] font-bold hover:bg-gray-800 transition-colors shadow-[0_4px_14px_rgba(0,0,0,0.15)] disabled:opacity-70 flex items-center gap-2"
                >
                  {isUploading ? "UPLOADING..." : "ADD"}
                </button>
              </div>

              <div className="flex items-center justify-between text-[12px] text-[#9CA3AF] pt-4">
                <span>All Rights Reserved © Jewels India</span>
                <span className="flex items-center gap-1">Crafted with <span className="text-pink-400">❤️</span> in blr</span>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </>
  );
}
