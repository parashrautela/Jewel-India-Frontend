"use client";
import { useRouter } from "next/navigation";
import { useRetailerOnboard } from "../../../context/RetailerOnboardContext";
import imageCompression from "browser-image-compression";

export function RetailerStep3Footer({ isFormValid, referralCode, onSubmitAttempt }) {
  const router = useRouter();
  const {
    name, aadhar, frontImage, backImage,
    businessName, selectedState, selectedCity, logoImage,
    panFile, gstFile,
    isSubmitting, setIsSubmitting, setSubmitError
  } = useRetailerOnboard();

  const compressImage = async (file, namePrefix) => {
    if (!file || !(file instanceof File)) return file;
    // Don't compress PDFs!
    if (file.type === "application/pdf") return file;

    try {
      const options = {
        maxSizeMB: 1, // Aggressive max size 1MB default
        maxWidthOrHeight: 1200,
        useWebWorker: true,
        fileType: "image/jpeg",
        initialQuality: 0.7, // Add initial quality
      };

      // Strict enforcement for specific high-risk fields
      if (namePrefix.includes('logo')) {
        options.maxSizeMB = 0.5; // Logos should be < 500kb
        options.maxWidthOrHeight = 800; // Smaller resolution
      } else if (namePrefix.includes('pan') || namePrefix.includes('gst')) {
        options.maxSizeMB = 1.5; // Docs need some clarity
        options.maxWidthOrHeight = 1600; 
      }

      const compressedFile = await imageCompression(file, options);
      return new File([compressedFile], `${namePrefix}.jpg`, { type: "image/jpeg" });
    } catch (error) {
      console.warn(`Compression failed for ${namePrefix}:`, error);
      return file; // Fallback to original
    }
  };

  const submitToBackend = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("aadhar", aadhar);
      formData.append("businessName", businessName);
      formData.append("state", selectedState);
      formData.append("city", selectedCity);

      // The invitation always goes along; a new application is refused without it.
      // Keep it for a retry so the field doesn't have to be filled twice.
      if (referralCode) {
        formData.append("referralCode", referralCode);
        sessionStorage.setItem("referral_code", referralCode);
      }

      // Parallel compression for all files
      const [
        cFrontImage, 
        cBackImage, 
        cPanFile, 
        cGstFile, 
        cLogoImage
      ] = await Promise.all([
        compressImage(frontImage, 'aadharFront'),
        compressImage(backImage, 'aadharBack'),
        compressImage(panFile, 'panCard'),
        compressImage(gstFile, 'gstCert'),
        compressImage(logoImage, 'logo')
      ]);

      if (cFrontImage) formData.append("aadharFront", cFrontImage);
      if (cBackImage) formData.append("aadharBack", cBackImage);
      if (cPanFile) formData.append("panCard", cPanFile);
      if (cGstFile) formData.append("gstCertificate", cGstFile);
      if (cLogoImage) formData.append("businessLogo", cLogoImage);

      const response = await fetch("/api/onboard-retailer/submit", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit onboarding data");
      }

      router.push("/onboard-retailer/submitted");
    } catch (error) {
      console.error("Submission error:", error);
      setSubmitError(error.message || "An unexpected error occurred. Please try again.");
      setIsSubmitting(false); // Only reset if failed. On success, we navigate away.
    }
  };

  const handleSubmit = () => {
    if (isFormValid) {
      submitToBackend();
    } else {
      onSubmitAttempt();
    }
  };

  return (
    <div className="w-full flex justify-end">
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isFormValid || isSubmitting}
        className={`w-full md:w-[160px] font-extrabold rounded-[10px] px-4 py-[clamp(10px,1.2vw,14px)] text-[clamp(13px,1.4vw,15px)] transition-all tracking-wide ${
          isFormValid && !isSubmitting
            ? "bg-[#000000] text-white hover:bg-black/90 cursor-pointer"
            : "bg-[#D1D5DB] text-white cursor-not-allowed"
        }`}
      >
        {isSubmitting ? "Submitting..." : "Submit"}
      </button>
    </div>
  );
}
