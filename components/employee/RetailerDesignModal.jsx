"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export function RetailerDesignModal({ isOpen, onClose, design, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (design) {
      setFormData({
        title: design.title || "",
        category: design.category || "",
        style_aesthetic: design.style_aesthetic || "",
        size: design.size || "",
        purity: design.purity || "",
        gross_weight: design.gross_weight || "",
        stone_weight: design.stone_weight || "",
        net_weight: design.net_weight || "",
        production_type: design.production_type || "",
      });
      setIsEditing(false);
    }
  }, [design]);

  if (!isOpen || !design) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/designs/${design.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed to save changes");
      const { data } = await res.json();
      if (onUpdate) onUpdate(data);
      setIsEditing(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const title = design.title || "Jewelry Piece";
  const category = design.category || "Jewellery";

  return (
    <div data-employee-fullscreen className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.4)] backdrop-blur-sm p-4 overflow-hidden" onClick={onClose}>
      <div 
        data-employee-dialog
        className="relative bg-white rounded-[24px] shadow-[0_16px_40px_rgba(0,0,0,0.12)] w-full max-w-[1000px] max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Column - Image Viewer (~58%) */}
        <div className="w-full md:w-[58%] p-6 flex flex-col gap-4 border-r border-[#f0f0f0]">
          <div className="w-full aspect-square bg-[#F5F5F5] rounded-[16px] flex items-center justify-center overflow-hidden relative">
            <Image
              src={design.image_url}
              alt={title}
              fill
              sizes="(max-width: 768px) 100vw, 58vw"
              className="w-full h-full object-contain mix-blend-multiply p-4"
              loading="lazy"
            />
          </div>
        </div>

        {/* Right Column - Product Info (~42%) */}
        <div className="w-full md:w-[42%] p-8 flex flex-col relative">
          
          {/* Top Right Actions */}
          <div className="absolute top-6 right-6 flex items-center gap-3">
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)} 
                className="text-[#999] hover:text-[#111] transition-colors bg-transparent border-none p-0 outline-none cursor-pointer" 
                aria-label="Edit"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
            )}
            <button onClick={onClose} className="text-[#999] hover:text-[#111] transition-colors ml-2 bg-transparent border-none p-0 outline-none cursor-pointer" aria-label="Close">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div className="pr-[60px] mb-8">
            {isEditing ? (
              <div className="space-y-3">
                <input 
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Title"
                  className="w-full text-[20px] font-bold text-[#1A1A1A] border-b border-[#eee] focus:border-[#111] outline-none pb-1"
                />
                <input 
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  placeholder="Category"
                  className="w-full text-[14px] text-[#888] border-b border-[#eee] focus:border-[#111] outline-none pb-1"
                />
              </div>
            ) : (
              <>
                <h2 className="text-[20px] font-bold text-[#1A1A1A] leading-tight">{title}</h2>
                <p className="text-[14px] text-[#888] mt-1">{category}</p>
              </>
            )}
          </div>

          {/* Specifications Card */}
          <div className="bg-[#F8F8F8] rounded-[12px] p-5 mb-8">
            <h3 className="text-[14px] font-semibold text-[#1A1A1A] mb-4">Specifications</h3>
            <div className="flex flex-col gap-4">
              {[
                { label: "Style Aesthetic", name: "style_aesthetic" },
                { label: "Size", name: "size" },
                { label: "Purity", name: "purity" },
                { label: "Gross weight", name: "gross_weight", type: "number", suffix: "g" },
                { label: "Stone weight", name: "stone_weight", type: "number", suffix: "g" },
                { label: "Net weight", name: "net_weight", type: "number", suffix: "g" },
                { label: "Production Type", name: "production_type" },
              ].map((field) => (
                <div key={field.name} className="flex justify-between items-center">
                  <span className="text-[14px] text-[#666]">{field.label}</span>
                  {isEditing ? (
                    <input 
                      name={field.name}
                      type={field.type || "text"}
                      value={formData[field.name]}
                      onChange={handleChange}
                      className="text-[14px] font-semibold text-[#1A1A1A] bg-white border border-[#eee] rounded-md px-2 py-1 w-[120px] text-right outline-none focus:border-[#111]"
                    />
                  ) : (
                    <span className="text-[14px] font-semibold text-[#1A1A1A]">
                      {design[field.name] !== null && design[field.name] !== undefined ? `${design[field.name]}${field.suffix || ""}` : "-"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {isEditing && (
            <div className="mt-auto pt-6 flex flex-col gap-3">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-4 bg-[#111] text-white rounded-xl font-bold text-[14px] hover:bg-[#333] transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
              <button 
                onClick={() => setIsEditing(false)}
                className="w-full py-4 border border-[#eee] text-[#666] rounded-xl font-bold text-[14px] hover:bg-[#f9f9f9] transition-all"
              >
                Cancel
              </button>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
