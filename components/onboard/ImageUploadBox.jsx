"use client";
import { useRef, useState, useEffect } from "react";

export function ImageUploadBox({ label, image, onUpload, onRemove, error, objectFit = "cover", accept = "image/jpeg, image/png, image/webp", aspectRatio = "aspect-square" }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);

  const isPdf = image instanceof File && image.type === "application/pdf";

  useEffect(() => {
    if (image instanceof File && !isPdf) {
      const url = URL.createObjectURL(image);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreview(image);
    }
  }, [image, isPdf]);
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onUpload) {
      onUpload(file);
    }
  };

  const hasImage = !!image || !!preview;
  const borderClass = hasImage
    ? "border-[2px] border-solid border-[#22C55E]"
    : error
      ? "border-[1.5px] border-dashed border-[#EF4444]"
      : "border-[1.5px] border-dashed border-[#2563EB] [.theme-retailer_&]:border-2 [.theme-retailer_&]:border-[#1974cf]";

  const imageClassName = objectFit === "contain"
    ? "w-full h-full object-contain p-4"
    : "w-full h-full object-cover";

  return (
    <div className="flex flex-col gap-2 w-full">
      {label && <span className="text-[13px] font-semibold text-[#374151] [.theme-retailer_&]:text-[16px] [.theme-retailer_&]:text-[#46403b]">{label}</span>}

      <div
        onClick={() => { if (!hasImage && inputRef.current) inputRef.current.click() }}
        className={`w-full bg-[#EEF4FF] rounded-[12px] [.theme-retailer_&]:bg-[#e6f3ff] [.theme-retailer_&]:rounded-[8px] hover:bg-blue-50 transition-colors cursor-pointer ${aspectRatio} relative overflow-hidden flex items-center justify-center ${borderClass}`}
      >
        {hasImage ? (
          <>
            {isPdf ? (
              <div className="flex flex-col items-center justify-center p-4">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-[42px] h-[42px] text-red-500 mb-3">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <span className="text-[11px] font-medium text-[#6B7280] text-center w-full max-w-[120px] truncate px-2">{image.name}</span>
              </div>
            ) : (
              <img src={preview} alt={label} className={imageClassName} />
            )}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onRemove) onRemove();
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center text-[#6B7280] shadow-sm hover:text-black transition-colors z-10"
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-[14px] h-[14px]"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </>
        ) : (
          <div className={`w-12 h-12 rounded-full border-2 ${error ? 'border-[#EF4444] text-[#EF4444]' : 'border-[#2563EB] text-[#2563EB] [.theme-retailer_&]:border-[#1974cf] [.theme-retailer_&]:text-[#1974cf]'} flex items-center justify-center [.theme-retailer_&]:w-[68px] [.theme-retailer_&]:h-[68px]`}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-[26px] h-[26px]"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </div>
        )}

        <input
          type="file"
          ref={inputRef}
          accept={accept}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {error && <span className="text-[12px] text-[#EF4444] mt-1">{error}</span>}
    </div>
  );
}
