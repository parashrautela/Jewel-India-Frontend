"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./joinLanding.module.css";

export default function JoinLandingClient({
  code,
  businessName,
  wholesalerName,
  businessLogoUrl,
  giftCredits,
}) {
  const router = useRouter();

  useEffect(() => {
    sessionStorage.setItem("referral_code", code);
    sessionStorage.setItem("referral_role", "retailer");
  }, [code]);

  function handleGetStarted() {
    sessionStorage.setItem("referral_code", code);
    sessionStorage.setItem("referral_role", "retailer");
    router.push(`/entry_page/signup?ref=${encodeURIComponent(code)}&role=retailer`);
  }

  const displayName = wholesalerName ? wholesalerName.split(" ")[0] : (businessName || "Your partner");

  return (
    <div className={styles.pageContainer}>
      <div className={styles.card}>
        {/* Top Image Section */}
        <div className={styles.imageSection}>
          <img
            src="https://res.cloudinary.com/dcs0vuzwg/image/upload/v1777318932/Group_128_1_b9ydgb.png"
            alt="Referral Invitation"
            className={styles.cardImage}
          />
          <div className={styles.badge}>Referral</div>
          <div className={styles.textOverlay}>
            <h1 className={styles.name}>{displayName}</h1>
            <p className={styles.subtitle}>thinks you belong here</p>
          </div>
        </div>

        {giftCredits >= 1000 && <p className="px-6 pt-6 text-center text-sm">You’ll receive {giftCredits.toLocaleString()} credits after Jewel India verifies your store. This gift stays until spent.</p>}
        <div className="px-6 py-4 text-center"><p className="font-mono text-sm break-all select-all">Invitation code: {code}</p><p className="text-xs text-gray-500 mt-2">If you install the iPhone app, enter this code when joining.</p></div>
        {/* Bottom Button Section */}
        <div className={styles.buttonSection}>
          <button onClick={handleGetStarted} className={styles.ctaButton}>
            <span className={styles.ctaTextRegular}>Get</span>
            <span className={styles.ctaTextBold}>Started</span>
          </button>
        </div>
      </div>
    </div>
  );
}
