"use client";

export function RetailerIdentityForm({ name, setName, aadhar, setAadhar, submitAttempted }) {
  const isNameError = submitAttempted && name.trim().length === 0;
  const isAadharError = submitAttempted && aadhar.replace(/\s/g, "").length !== 12;

  const handleNameChange = (e) => {
    const val = e.target.value;
    if (/^[A-Za-z\s]*$/.test(val)) {
      setName(val);
    }
  };
  const handleAadharChange = (e) => {
    let digits = e.target.value.replace(/\D/g, "").slice(0, 12);
    let formatted = digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
    setAadhar(formatted);
  };

  return (
    <div className="flex flex-col gap-6 w-84">
      <div className="flex flex-col gap-1">
        <label htmlFor="retailer-name" className="text-[16px] font-semibold text-[#46403b]">
          Name*
        </label>
        <input
          id="retailer-name"
          type="text"
          value={name}
          onChange={handleNameChange}
          placeholder="Priya Sharma"
          className={`w-full bg-[#fafafa] border border-[#ededed] rounded-[8px] min-h-[56px] placeholder-[#a8a19c] outline-none px-[clamp(10px,1.5vw,16px)] py-[clamp(8px,1.2vw,14px)] text-[clamp(13px,1.4vw,15px)] text-[#374151] placeholder:text-[#9CA3AF] transition-shadow ${
            isNameError
              ? "border-[1.5px] border-[#EF4444]"
              : "border-none focus:ring-2 focus:ring-black/10"
          }`}
        />
        {isNameError && <span className="text-[12px] text-[#EF4444]">Name is required</span>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="retailer-aadhar" className="text-[16px] font-semibold text-[#46403b]">
          Aadhar Number*
        </label>
        <input
          id="retailer-aadhar"
          type="text"
          value={aadhar}
          onChange={handleAadharChange}
          placeholder="**** **** ****"
          className={`w-full bg-[#fafafa] border border-[#ededed] rounded-[8px] min-h-[56px] placeholder-[#a8a19c] outline-none px-[clamp(10px,1.5vw,16px)] py-[clamp(8px,1.2vw,14px)] text-[clamp(13px,1.4vw,15px)] text-[#374151] placeholder:text-[#9CA3AF] transition-shadow ${
            isAadharError
              ? "border-[1.5px] border-[#EF4444]"
              : "border-none focus:ring-2 focus:ring-black/10"
          }`}
        />
        {isAadharError && (
          <span className="text-[12px] text-[#EF4444]">Enter a valid 12-digit Aadhar number</span>
        )}
      </div>
    </div>
  );
}
