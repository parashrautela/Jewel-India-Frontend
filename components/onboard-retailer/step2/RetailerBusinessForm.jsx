"use client";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi",
];

export function RetailerBusinessForm({
  businessName, setBusinessName,
  selectedState, setSelectedState,
  selectedCity, setSelectedCity,
  submitAttempted,
}) {
  const isNameError = submitAttempted && businessName.trim().length < 2;
  const isStateError = submitAttempted && selectedState === "";
  const isCityError = submitAttempted && selectedCity === "";
  return (
    <div className="flex flex-col gap-[clamp(16px,2vw,24px)] w-full">
      {/* Business / Store Name */}
      <div className="flex flex-row gap-[clamp(8px,1.5vw,24px)] w-full">
        <div className="w-full md:w-[58%] md:flex-none flex flex-col gap-2 min-w-0">
          <label htmlFor="retailer-businessName" className="text-[16px] font-semibold text-[#46403b]">
            Store name*
          </label>
          <input
            id="retailer-businessName"
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Priya Jewellers"
            className={`w-full bg-[#fafafa] border border-[#ededed] rounded-[8px] min-h-[56px] placeholder-[#a8a19c] outline-none px-[clamp(10px,1.5vw,16px)] py-[clamp(8px,1.2vw,14px)] text-[clamp(13px,1.4vw,15px)] text-[#374151] placeholder:text-[#9CA3AF] transition-shadow ${
              isNameError
                ? "border-[1.5px] border-[#EF4444]"
                : "border-none focus:ring-2 focus:ring-black/10"
            }`}
          />
          {isNameError && (
            <span className="text-[12px] text-[#EF4444]">Store name is required</span>
          )}
        </div>
        {/* Spacer to align with the logo upload below */}
        <div className="flex-1 min-w-0 hidden md:block" />
      </div>

      {/* State + City */}
      <div className="flex flex-row gap-[clamp(8px,1.5vw,24px)] w-full">
        {/* State */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <label htmlFor="retailer-state" className="text-[16px] font-semibold text-[#46403b]">
            State*
          </label>
          <div className="relative">
            <select
              id="retailer-state"
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedCity(""); // reset city on state change
              }}
              className={`w-full appearance-none bg-[#FFFFFF] rounded-[8px] border outline-none px-[clamp(10px,1.5vw,16px)] py-[clamp(8px,1.2vw,14px)] text-[clamp(13px,1.4vw,15px)] text-[#374151] transition-shadow cursor-pointer ${
                isStateError
                  ? "border-[#EF4444]"
                  : "border-[#E5E7EB] focus:ring-2 focus:ring-black/10"
              }`}
            >
              <option value="" disabled className="text-[#9CA3AF]">select</option>
              {INDIAN_STATES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
            <div
              className={`pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 ${
                selectedState ? "text-[#374151]" : "text-[#9CA3AF]"
              }`}
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-[clamp(12px,1.5vw,16px)] h-[clamp(12px,1.5vw,16px)]">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {isStateError && (
            <span className="text-[12px] text-[#EF4444]">Please select a state</span>
          )}
        </div>

        {/* City */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <label htmlFor="retailer-city" className="text-[16px] font-semibold text-[#46403b]">
            City*
          </label>
          <input
            id="retailer-city"
            type="text"
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            disabled={!selectedState}
            placeholder="select"
            className={`w-full rounded-[8px] border outline-none px-[clamp(10px,1.5vw,16px)] py-[clamp(8px,1.2vw,14px)] text-[clamp(13px,1.4vw,15px)] text-[#374151] placeholder:text-[#9CA3AF] transition-shadow ${
              !selectedState
                ? "bg-[#F9FAFB] border-[#E5E7EB] cursor-not-allowed opacity-80"
                : isCityError
                  ? "bg-[#FFFFFF] border-[#EF4444]"
                  : "bg-[#FFFFFF] border-[#E5E7EB] focus:ring-2 focus:ring-black/10"
            }`}
          />
          {isCityError && (
            <span className="text-[12px] text-[#EF4444]">Please enter a city</span>
          )}
        </div>
      </div>
    </div>
  );
}
