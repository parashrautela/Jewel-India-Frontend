"use client";

import { useState } from "react";
import { Select } from "../ui/Select";
import { Toggle } from "../ui/Toggle";
import { Input } from "../ui/Input";
import { InputWithSuffix } from "../ui/InputWithSuffix";
import { ImageUpload } from "./ImageUpload";
import { uploadProduct } from "../../lib/api/products";
import { saveProduct, insertProduct } from "../../lib/actions/products";
import { uploadProductDraftImage } from "../../lib/supabase/product-queries";
import { useRouter } from "next/navigation";
import { useUploadUsage } from "../../lib/hooks/useUploadUsage";

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

const INITIAL_FORM = {
  jewellery_type: "",
  category: "",
  style: "",
  size: "",
  stockAvailable: false,
  makeToOrderDays: "",
  metalPurity: "",
  netWeight: "",
  grossWeight: "",
  stoneWeight: "",
  title: "",
};

function NumberIndicator({ number }) {
  return (
    <div className="w-[26px] h-[26px] rounded-full bg-black text-white flex items-center justify-center text-xs font-medium shrink-0">
      {number}
    </div>
  );
}

const formatResetTime = (isoString) => {
  if (!isoString) return "";
  try {
    const cleanStr = typeof isoString === "string"
      ? isoString.replace(/\+00:00Z$/, "Z").replace(/\+00:00$/, "Z")
      : isoString;
    const date = new Date(cleanStr);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return "";
  }
};

export function AddProductForm({ userId }) {
  const router = useRouter();
  const [form, setForm] = useState(INITIAL_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});
  const { used, limit, resetsAt, isLoading: usageLoading, isLimitReached, refetch: refetchUsage } = useUploadUsage(userId);

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

  async function handleSubmit(e, uploadLater = false) {
    e.preventDefault();
    const newErrors = {};

    if (!uploadLater && !imageFile) {
      newErrors.image = "Please upload a product image.";
    }
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

    setError(null);
    setErrors({});

    try {
      if (uploadLater) {
        let raw_image_url = null;
        if (imageFile) {
          setStatus("uploading");
          raw_image_url = await uploadProductDraftImage(imageFile, userId);
        }

        setStatus("saving");
        const saveResult = await insertProduct({
            title: form.title || JEWELLERY_TYPES.find((t) => t.value === form.jewellery_type)?.label || "Untitled",
            jewellery_type: form.jewellery_type || null,
            category: form.category || null,
            style: form.style || null,
            size: form.size || null,
            stock_available: form.stockAvailable,
            is_published: false,
            make_to_order_days: form.makeToOrderDays || null,
            metal_purity: form.metalPurity || null,
            net_weight: form.netWeight || null,
            gross_weight: form.grossWeight || null,
            stone_weight: form.stoneWeight || null,
            raw_image_url,
          });

        if (saveResult?.error) {
          throw new Error(saveResult.error);
        }

        setStatus("done");
        await refetchUsage();
        router.push("/dashboard/wholesaler/catalogue");
        return;
      }

      setStatus("uploading");
      const titleToUse = form.title ||
        JEWELLERY_TYPES.find((t) => t.value === form.jewellery_type)?.label ||
        undefined;

      const { product_id, raw_image_url } = await uploadProduct({
        file: imageFile,
        title: titleToUse,
        jewellery_type: form.jewellery_type || undefined,
        wholesaler_id: userId,
      });

      setStatus("saving");
      const saveResult = await saveProduct({
        product_id,
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
        raw_image_url: raw_image_url || null,
        processed_image_url: null,
        generated_image_urls: null,
      });

      if (saveResult?.error) {
        throw new Error(saveResult.error);
      }

      setStatus("done");
      await refetchUsage();
      router.push("/dashboard/wholesaler/add-product/success");
    } catch (err) {
      if (err.status === 429) {
        await refetchUsage();
        setError("Daily upload limit reached. Please try again tomorrow.");
      } else {
        setError(err.message);
      }
      setStatus("error");
    }
  }

  function handleReset() {
    setForm(INITIAL_FORM);
    setImageFile(null);
    setError(null);
    setErrors({});
    setStatus("idle");
  }

  const isProcessing = status === "uploading" || status === "saving" || status === "done";

  // While uploading/saving/redirecting, show a simple spinner full-screen overlay so the user sees it's working
  if (isProcessing) {
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-[50vh] animate-fade-in">
        <div className="w-10 h-10 border-[1.5px] border-celestique-taupe border-t-black rounded-full animate-spin mb-4" />
        <p className="text-sm font-gilroy text-gray-500 uppercase tracking-widest">
          {status === "uploading" ? "Uploading Image..." : status === "saving" ? "Saving metadata..." : "Redirecting..."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 md:gap-10">
      {/* Page Title */}
      <div className="flex flex-col items-center text-center gap-2.5">
        <h1 className="text-[28px] md:text-4xl font-semibold text-[#111827] font-cirka">Add new product</h1>
        <p className="text-base text-[#6B7280] font-gilroy font-medium">
          Enter the details below to create a sparkling new listing.
        </p>
      </div>

      {/* Daily Upload Limit Banner */}
      {usageLoading ? (
        <div className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 animate-pulse flex flex-col gap-2">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-1.5 bg-gray-200 rounded-full w-full"></div>
        </div>
      ) : limit && limit !== Infinity ? (
        isLimitReached ? (
          <div className="w-full bg-[#FFFDF5] border border-[#FBEFBE] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-start gap-3">
              <span className="text-amber-600 text-lg mt-0.5">⚠️</span>
              <div>
                <h4 className="text-sm font-semibold text-[#856404] font-gilroy">Daily upload limit reached</h4>
                <p className="text-xs text-[#856404]/80 font-gilroy mt-0.5">
                  You have used all {limit} uploads for today.
                  {resetsAt && ` Resets at ${formatResetTime(resetsAt)}.`}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-[#856404] bg-[#FBEFBE]/60 px-2.5 py-1 rounded-full shrink-0 font-gilroy self-start sm:self-center">
              {used} / {limit} Used
            </span>
          </div>
        ) : (
          <div className="w-full bg-white border border-[#e5e5e5] rounded-xl p-4 flex flex-col gap-3 animate-fade-in">
            <div className="flex justify-between items-center text-sm font-gilroy">
              <span className="text-[#374151] font-medium">Daily Upload Progress</span>
              <span className="text-[#6B7280] font-medium">{used} / {limit} uploads used today</span>
            </div>
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-black h-full transition-all duration-500 ease-out" 
                style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
              />
            </div>
          </div>
        )
      ) : null}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 md:gap-10">

        {/* ── Section 1 — Product Image ── */}
        <div className="flex flex-col md:flex-row w-full md:justify-between md:gap-6 md:items-start gap-4">
          {/* Left / Top — Info */}
          <div className="flex flex-col gap-3 md:gap-4 md:max-w-[360px]">
            <div className="flex items-center gap-3 md:-ml-10">
              <NumberIndicator number={1} />
              <h2 className="text-[20px] md:text-3xl font-semibold text-[#111827] font-gilroy font-bold">Product image</h2>
            </div>
            {/* Align description under h2 on mobile using spacer matching badge width */}
            <div className="flex gap-3 md:block">
              <div className="w-[26px] shrink-0 md:hidden" />
              <p className="text-sm text-[#6B7280] leading-relaxed font-gilroy">
                Upload a clear image. We&apos;ll remove the background first, then enhance it.
              </p>
            </div>

            {/* Tips box */}
            <div className="text-sm text-[#6B7280] leading-relaxed font-gilroy">
              <p className="font-bold text-[#374151] mb-2">Get the best result from your photo:</p>
              {/* Ordered list on desktop, bullet list on mobile */}
              <ol className="hidden md:block list-decimal list-inside space-y-1 text-[#6B7280]">
                <li>Place the jewellery on a background that contrasts with the product.</li>
                <li>Upload a clear well-lit photo.</li>
                <li>Keep only the product in the frame</li>
              </ol>
              <ul className="md:hidden list-disc list-inside space-y-1 text-[#6B7280]">
                <li>Place the jewellery on a background that contrasts with the product.</li>
                <li>Upload a clear well-lit photo.</li>
                <li>Keep only the product in the frame</li>
              </ul>
            </div>
          </div>

          {/* Right / Bottom — Upload box */}
          <div className="w-full md:flex-1 md:max-w-[430px]">
            <ImageUpload
              onFileChange={(file) => {
                setImageFile(file);
                if (errors.image) {
                  setErrors((prev) => {
                    const updated = { ...prev };
                    delete updated.image;
                    return updated;
                  });
                }
              }}
              error={errors.image}
            />
          </div>
        </div>

        {/* ── Section 2 — Essential Details ── */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 md:-ml-10">
            <NumberIndicator number={2} />
            <h2 className="text-[20px] md:text-3xl font-semibold text-[#111827] font-gilroy">Essential details</h2>
          </div>

          {/* Description + Product Title */}
          {/* Desktop: side-by-side | Mobile: stacked */}
          <div className="flex flex-col md:flex-row w-full md:justify-between md:gap-6 md:items-start gap-4">
            <div className="pl-[38px] md:pl-0">
              <p className="text-sm text-[#6B7280] leading-relaxed font-gilroy">
                Add the key information that helps retailers <br className="hidden md:inline" />understand and find this peice.
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

          {/* Type + Material Category — 2 cols on desktop, stacked on mobile */}
          <div className="flex flex-col md:flex-row md:gap-5 w-full gap-4">
            <div className="w-full md:flex-1">
              <Select
                id="jewellery_type"
                label="Type"
                options={JEWELLERY_TYPES}
                value={form.jewellery_type}
                onChange={(e) => setField("jewellery_type", e.target.value)}
                placeholder="select"
                placeholderClassName="text-black"
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
                placeholderClassName="text-black"
                error={errors.category}
              />
            </div>
          </div>

          {/* Style, Size, Purity — 3 cols on desktop, stacked on mobile */}
          <div className="flex flex-col md:flex-row md:gap-5 w-full gap-4">
            <div className="w-full md:flex-1">
              <Select
                id="style"
                label="Style Aesthetic"
                options={STYLES}
                value={form.style}
                onChange={(e) => setField("style", e.target.value)}
                placeholder="select"
                placeholderClassName="text-black"
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
                placeholderClassName="text-black"
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
                placeholderClassName="text-black"
                error={errors.metalPurity}
              />
            </div>
          </div>
        </div>

        {/* ── Section 3 — Specifications ── */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 md:-ml-10">
            <NumberIndicator number={3} />
            <h2 className="text-[20px] md:text-3xl font-semibold text-[#111827] font-gilroy">Specifications</h2>
          </div>

          <p className="pl-[38px] md:pl-0 text-sm text-[#6B7280] leading-relaxed font-gilroy">
            Add weight and stone details so retailers <br className="hidden md:inline" /> know exactly what they&apos;re getting.
          </p>

          {/* Weight inputs — mobile: stacked | desktop: 3-col flex row */}
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

          {/* Stock Toggle — full-width on both */}
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

          {/* Production time — full-width on mobile */}
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


        {/* Error */}
        {error && (
          <div className="border border-red-200 bg-red-50 p-4 rounded-lg animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-red-100 text-red-600 text-sm font-bold">
                !
              </div>
              <div>
                <h3 className="text-sm font-medium text-red-900">Submission Error</h3>
                <p className="text-sm text-red-700 mt-0.5">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Submit Area ── */}
        {/* Desktop: disclaimer left-aligned, button right | Mobile: full-width button + centered disclaimer below */}
        <div className="mt-0 w-full">
          {/* Mobile layout */}
          <div className="flex flex-col gap-3 md:hidden pb-10">
            <button
              type="submit"
              disabled={isLimitReached}
              className={`w-full py-3.5 rounded-full font-medium transition-colors font-gilroy text-base ${
                isLimitReached
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-black text-white cursor-pointer hover:bg-black/90"
              }`}
            >
              Submit
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              className="w-full py-3.5 rounded-full font-medium transition-colors font-gilroy text-base border border-black text-black bg-white hover:bg-gray-50 cursor-pointer"
            >
              Save & Upload Later
            </button>
            <p className="text-[10px] font-bold text-[#000000] text-center font-gilroy">
              *By submitting, you allow us to display your product details and<br />images to retailers on the platform.
            </p>
          </div>

          {/* Desktop layout */}
          <div className="hidden md:flex justify-end items-center gap-3">
            <p className="text-[8px] font-bold text-[#000000] max-w-[500px] font-gilroy mt-6.5">
              *By submitting, you allow us to display your product details <br />and images to retailers on the platform.
            </p>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              className="px-7 py-3 rounded-lg font-medium transition-colors font-gilroy border border-black text-black bg-white hover:bg-gray-50 cursor-pointer"
            >
              Save & Upload Later
            </button>
            <button
              type="submit"
              disabled={isLimitReached}
              className={`px-7 py-3 rounded-lg font-medium transition-colors font-gilroy ${
                isLimitReached
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-black text-white cursor-pointer hover:bg-black/90"
              }`}
            >
              Submit
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
