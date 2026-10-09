"use client";

import { useState } from "react";
import { normalizeChainType } from "../../lib/config/jewelleryTypes.mjs";
import { Select } from "../ui/Select";
import { Toggle } from "../ui/Toggle";
import { Input } from "../ui/Input";
import { InputWithSuffix } from "../ui/InputWithSuffix";
import { saveProduct } from "../../lib/actions/products";
import { useRouter } from "next/navigation";
import Image from "next/image";

const JEWELLERY_TYPES = [
  { value: "necklace", label: "Necklace" },
  { value: "chain", label: "Chains" },
  { value: "rings", label: "Rings" },
  { value: "earrings", label: "Earrings" },
  { value: "haram", label: "Haram" },
  { value: "pendant", label: "Pendant" },
  { value: "bangles", label: "Bangles" },
  { value: "nosepins", label: "Nosepins" },
  { value: "mangalsutra", label: "Mangalsutra" },
];
const CATEGORIES = [
  { value: "gold", label: "Gold" },
  { value: "silver", label: "Silver" },
  { value: "diamond", label: "Diamond" },
  { value: "platinum", label: "Platinum" },
  { value: "gemstone", label: "Gemstone" },
  { value: "pearl", label: "Pearl" },
];

const STYLES = [
  { value: "traditional", label: "Traditional" },
  { value: "modern", label: "Modern" },
  { value: "fusion", label: "Fusion" },
  { value: "antique", label: "Antique" },
  { value: "minimalist", label: "Minimalist" },
  { value: "bridal", label: "Bridal" },
];

const SIZES = [
  { value: "xs", label: "XS" },
  { value: "s", label: "S" },
  { value: "m", label: "M" },
  { value: "l", label: "L" },
  { value: "xl", label: "XL" },
  { value: "freesize", label: "Free Size" },
];

const METAL_PURITIES = [
  { value: "24k", label: "24K (999)" },
  { value: "22k", label: "22K (916)" },
  { value: "18k", label: "18K (750)" },
  { value: "14k", label: "14K (585)" },
  { value: "925", label: "925 Silver" },
  { value: "950pt", label: "950 Platinum" },
];

function NumberIndicator({ number }) {
  return (
    <div className="w-[26px] h-[26px] rounded-full bg-black text-white flex items-center justify-center text-xs font-medium shrink-0">
      {number}
    </div>
  );
}

export function EditProductForm({ product }) {
  const router = useRouter();

  const [form, setForm] = useState({
    jewellery_type: normalizeChainType(product?.jewellery_type) || "",
    category: product?.category || "",
    style: product?.style || "",
    size: product?.size || "",
    stockAvailable: product?.stock_available || false,
    makeToOrderDays: product?.make_to_order_days?.toString() || "",
    metalPurity: product?.metal_purity || "",
    netWeight: product?.net_weight?.toString() || "",
    grossWeight: product?.gross_weight?.toString() || "",
    stoneWeight: product?.stone_weight?.toString() || "",
    title: product?.title || "",
  });

  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    }
  }

  const imgUrl = product?.processed_image_url || product?.generated_image_urls?.[0] || product?.raw_image_url;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    const newErrors = {};

    if (!form.title || !form.title.trim()) {
      newErrors.title = "Product title is required.";
    }
    if (!form.jewellery_type) {
      newErrors.jewellery_type = "Please select a jewellery type.";
    }
    if (!form.category) {
      newErrors.category = "Please select a material category.";
    }
    if (!form.style) {
      newErrors.style = "Please select a style aesthetic.";
    }
    if (!form.size) {
      newErrors.size = "Please select a size.";
    }
    if (!form.metalPurity) {
      newErrors.metalPurity = "Please select a purity.";
    }

    const grossVal = parseFloat(form.grossWeight);
    if (!form.grossWeight || isNaN(grossVal) || grossVal <= 0) {
      newErrors.grossWeight = "Gross weight must be greater than 0.";
    }

    const stoneVal = parseFloat(form.stoneWeight);
    if (form.stoneWeight === "" || isNaN(stoneVal) || stoneVal < 0) {
      newErrors.stoneWeight = "Stone weight must be 0 or greater.";
    }

    const netVal = parseFloat(form.netWeight);
    if (!form.netWeight || isNaN(netVal) || netVal <= 0) {
      newErrors.netWeight = "Net weight must be greater than 0.";
    }

    if (!form.stockAvailable) {
      const orderDays = parseInt(form.makeToOrderDays);
      if (!form.makeToOrderDays || isNaN(orderDays) || orderDays <= 0) {
        newErrors.makeToOrderDays = "Production time must be greater than 0 days.";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setError("Please correct the fields highlighted in red below.");
      
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

    try {
      setStatus("saving");
      
      const saveResult = await saveProduct({
        product_id: product.id,
        title: form.title || JEWELLERY_TYPES.find((t) => t.value === form.jewellery_type)?.label || "Untitled",
        jewellery_type: form.jewellery_type || null,
        category: form.category || null,
        style: form.style || null,
        size: form.size || null,
        stock_available: form.stockAvailable,
        make_to_order_days: form.makeToOrderDays || null,
        metal_purity: form.metalPurity || null,
        net_weight: form.netWeight || null,
        gross_weight: form.grossWeight || null,
        stone_weight: form.stoneWeight || null,
      });

      if (saveResult?.error) {
        throw new Error(saveResult.error);
      }

      setStatus("done");
      router.push("/dashboard/wholesaler/catalogue");
    } catch (err) {
      setStatus("error");
      setError(err.message);
    }
  }

  const isProcessing = status === "saving" || status === "done";

  if (isProcessing) {
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-[50vh] animate-fade-in">
        <div className="w-10 h-10 border-[1.5px] border-celestique-taupe border-t-black rounded-full animate-spin mb-4" />
        <p className="text-sm font-gilroy text-gray-500 uppercase tracking-widest">
          {status === "saving" ? "Updating product..." : "Redirecting..."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 md:gap-10">
      <div className="flex flex-col items-center text-center gap-2.5">
        <h1 className="text-[28px] md:text-4xl font-semibold text-[#111827] font-cirka">Edit product</h1>
        <p className="text-base text-[#6B7280] font-gilroy font-medium">
          Update the details below for your existing listing.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 md:gap-10">
        <div className="flex flex-col items-center justify-center mb-4">
          <div className="relative w-[200px] h-[200px] rounded-xl overflow-hidden bg-[#F5F5F5] border border-[#e5e5e5] flex flex-col items-center justify-center">
            {imgUrl ? (
              <Image src={imgUrl} alt={form.title || "Product"} fill className="object-cover mix-blend-multiply" />
            ) : (
              <div className="flex flex-col items-center justify-center text-[#999] gap-2 p-4 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.5 2h11l4 6-9.5 14L2.5 8l4-6z" />
                </svg>
                <span className="text-[12px] font-medium font-gilroy">No Image Uploaded</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Essential Details ── */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 md:-ml-10">
            <NumberIndicator number={1} />
            <h2 className="text-[20px] md:text-3xl font-semibold text-[#111827] font-gilroy">Essential details</h2>
          </div>

          <div className="flex flex-col md:flex-row w-full md:justify-between md:gap-6 md:items-start gap-4">
            <div className="pl-[38px] md:pl-0">
              <p className="text-sm text-[#6B7280] leading-relaxed font-gilroy">
                Update the key information that helps retailers <br className="hidden md:inline" />understand and find this piece.
              </p>
            </div>
            <div className="w-full md:flex-1 md:max-w-[430px]">
              <Input
                id="title"
                name="title"
                label="Product Title"
                type="text"
                placeholder="eg. Vintage gold Necklace"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                error={errors.title}
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:gap-5 w-full gap-4">
            <div className="w-full md:flex-1">
              <Select
                id="jewellery_type"
                label="Type"
                options={JEWELLERY_TYPES}
                value={form.jewellery_type}
                onChange={(e) => setField("jewellery_type", e.target.value)}
                placeholder="select"
                error={errors.jewellery_type}
              />
            </div>
            <div className="w-full md:flex-1">
              <Select
                id="category"
                label="Material Category"
                options={CATEGORIES}
                value={form.category}
                onChange={(e) => setField("category", e.target.value)}
                placeholder="select"
                error={errors.category}
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:gap-5 w-full gap-4">
            <div className="w-full md:flex-1">
              <Select
                id="style"
                label="Style Aesthetic"
                options={STYLES}
                value={form.style}
                onChange={(e) => setField("style", e.target.value)}
                placeholder="select"
                error={errors.style}
              />
            </div>
            <div className="w-full md:flex-1">
              <Select
                id="size"
                label="Size"
                options={SIZES}
                value={form.size}
                onChange={(e) => setField("size", e.target.value)}
                placeholder="select"
                error={errors.size}
              />
            </div>
            <div className="w-full md:flex-1">
              <Select
                id="metalPurity"
                label="Purity"
                options={METAL_PURITIES}
                value={form.metalPurity}
                onChange={(e) => setField("metalPurity", e.target.value)}
                placeholder="select"
                error={errors.metalPurity}
              />
            </div>
          </div>
        </div>

        {/* ── Specifications ── */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 md:-ml-10">
            <NumberIndicator number={2} />
            <h2 className="text-[20px] md:text-3xl font-semibold text-[#111827] font-gilroy">Specifications</h2>
          </div>

          <p className="pl-[38px] md:pl-0 text-sm text-[#6B7280] leading-relaxed font-gilroy">
            Update weight and stone details so retailers <br className="hidden md:inline" /> know exactly what they&apos;re getting.
          </p>

          <div className="flex flex-col sm:grid sm:grid-cols-3 md:flex md:flex-row gap-4 md:gap-5 w-full md:max-w-xl mt-2">
            <div className="w-full sm:col-span-1 md:flex-1">
              <InputWithSuffix
                id="grossWeight"
                label="Gross Weight"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                suffix="g"
                value={form.grossWeight}
                onChange={(e) => setField("grossWeight", e.target.value)}
                error={errors.grossWeight}
              />
            </div>
            <div className="w-full sm:col-span-1 md:flex-1">
              <InputWithSuffix
                id="stoneWeight"
                label="Stone Weight"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                suffix="g"
                value={form.stoneWeight}
                onChange={(e) => setField("stoneWeight", e.target.value)}
                error={errors.stoneWeight}
              />
            </div>
            <div className="w-full sm:col-span-1 md:flex-1">
              <InputWithSuffix
                id="netWeight"
                label="Net Weight"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                suffix="g"
                value={form.netWeight}
                onChange={(e) => setField("netWeight", e.target.value)}
                error={errors.netWeight}
              />
            </div>
          </div>

          <div className="flex justify-between items-center py-4 w-full">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold text-[#111827] font-gilroy">Available in Stock</span>
              <span className="text-sm text-[#6B7280] font-gilroy">Is this piece ready to shift right away?</span>
            </div>
            <Toggle
              id="stockAvailable"
              label=""
              checked={form.stockAvailable}
              onChange={(val) => {
                setField("stockAvailable", val);
                if (val && errors.makeToOrderDays) {
                  setErrors((prev) => {
                    const updated = { ...prev };
                    delete updated.makeToOrderDays;
                    return updated;
                  });
                }
              }}
            />
          </div>

          {!form.stockAvailable && (
            <div className="animate-fade-in w-full md:max-w-md">
              <InputWithSuffix
                id="makeToOrderDays"
                label="Production time"
                type="number"
                min="0"
                placeholder="eg. 14"
                suffix="days"
                value={form.makeToOrderDays}
                onChange={(e) => setField("makeToOrderDays", e.target.value)}
                error={errors.makeToOrderDays}
              />
            </div>
          )}
        </div>


        {error && (
          <div className="border border-red-200 bg-red-50 p-4 rounded-lg animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-red-100 text-red-600 text-sm font-bold">!</div>
              <div>
                <h3 className="text-sm font-medium text-red-900">Update Error</h3>
                <p className="text-sm text-red-700 mt-0.5">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-0 w-full">
          <div className="flex flex-col gap-3 md:hidden pb-10">
            <button type="submit" className="w-full bg-black text-white py-3.5 rounded-full font-medium cursor-pointer hover:bg-black/90 transition-colors font-gilroy text-base">
              Save Changes
            </button>
          </div>

          <div className="hidden md:flex justify-end items-center gap-3">
            <button type="button" onClick={() => router.back()} className="px-7 py-3 rounded-lg font-medium cursor-pointer hover:bg-gray-100 transition-colors font-gilroy text-black">
              Cancel
            </button>
            <button type="submit" className="bg-black text-white px-7 py-3 rounded-lg font-medium cursor-pointer hover:bg-black/90 transition-colors font-gilroy">
              Save Changes
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
