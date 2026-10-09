"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { fetchWallet, fetchRateCard } from "../lib/supabase/credits-queries";

const defaultCreditsState = {
  wallet: null,
  rateCard: {},
  rateCardList: [],
  isLoading: false,
  error: null,
  refresh: async () => {},
  costOf: () => null,
  feature: () => null,
};

const CreditsContext = createContext(defaultCreditsState);

export function CreditsProvider({ children }) {
  const [wallet, setWallet] = useState(null);
  const refreshing = useRef(false);
  const [rateCard, setRateCard] = useState({});
  const [rateCardList, setRateCardList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      setIsLoading(true);
      setError(null);

      const [walletData, pricesData] = await Promise.all([
        fetchWallet(),
        fetchRateCard().catch((err) => {
          console.warn("[CreditsContext] Rate card fetch notice:", err?.message);
          return [];
        }),
      ]);

      if (walletData && typeof walletData === "object") {
        setWallet(walletData);
      }

      if (Array.isArray(pricesData)) {
        setRateCardList(pricesData);
        const map = {};
        pricesData.forEach((item) => {
          if (item?.feature_key) {
            map[item.feature_key] = item;
          }
        });
        setRateCard(map);
      }
    } catch (err) {
      console.warn("[CreditsContext] Refresh notice:", err?.message);
      setWallet(null);
      setError(err?.message || "Failed to load credits.");
    } finally {
      refreshing.current = false;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onVisible = () => { if (!document.hidden) refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => { document.removeEventListener("visibilitychange", onVisible); window.removeEventListener("focus", onVisible); };
  }, [refresh]);

  useEffect(() => {
    if (!wallet?.resets_at || !wallet?.server_now) return;
    const remaining = Date.parse(wallet.resets_at) - Date.parse(wallet.server_now) - (Date.now() - wallet.received_at_ms);
    const timer = setTimeout(refresh, Math.max(250, remaining + 100));
    return () => clearTimeout(timer);
  }, [wallet, refresh]);

  /**
   * Get the credit cost for a specific feature key.
   * Returns null if rate card has not loaded or feature key is unknown.
   */
  const costOf = useCallback(
    (featureKey) => {
      if (!featureKey || !rateCard[featureKey]) return null;
      return rateCard[featureKey]?.credits ?? null;
    },
    [rateCard]
  );

  /**
   * Get the full price object for a feature key.
   */
  const feature = useCallback(
    (featureKey) => {
      return rateCard[featureKey] || null;
    },
    [rateCard]
  );

  const value = {
    wallet,
    rateCard,
    rateCardList,
    isLoading,
    error,
    refresh,
    costOf,
    feature,
  };

  return <CreditsContext.Provider value={value}>{children}</CreditsContext.Provider>;
}

export function useCredits() {
  const context = useContext(CreditsContext);
  return context || defaultCreditsState;
}
