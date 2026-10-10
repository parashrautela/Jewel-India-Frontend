"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { remainingMilliseconds, retryDelay } from "../lib/credits/schedule.mjs";
import { fetchWallet, fetchRateCard } from "../lib/supabase/credits-queries";

const defaultCreditsState = {
  wallet: null,
  lastKnownWallet: null,
  isStale: false,
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
  const [failures, setFailures] = useState(0);

  const refresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      setIsLoading(true);


      const [walletData, pricesData] = await Promise.all([
        fetchWallet(),
        fetchRateCard().catch((err) => {
          console.warn("[CreditsContext] Rate card fetch notice:", err?.message);
          return [];
        }),
      ]);

      if (walletData && typeof walletData === "object") {
        setWallet(walletData);
        setError(null);
        setFailures(0);
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
      // Retain last known data for the wallet page, but do not expose it as a
      // fresh spendable wallet to feature screens. Clear it on loss of access.
      if (["NOT_AUTHENTICATED", "NOT_VERIFIED"].includes(err?.code)) setWallet(null);
      setError(err?.message || "Failed to load credits.");
      setFailures(count => count + 1);
    } finally {
      refreshing.current = false;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialRefresh = setTimeout(() => void refresh(), 0);
    const onVisible = () => { if (!document.hidden) refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => { clearTimeout(initialRefresh); document.removeEventListener("visibilitychange", onVisible); window.removeEventListener("focus", onVisible); };
  }, [refresh]);

  useEffect(() => {
    if (isLoading) return;
    const remaining = remainingMilliseconds(wallet, performance.now());
    const delay = error ? retryDelay(failures) : remaining == null ? null : Math.max(1000, remaining + 100);
    if (delay == null) return;
    const timer = setTimeout(refresh, delay);
    return () => clearTimeout(timer);
  }, [wallet, error, failures, isLoading, refresh]);

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
    wallet: error ? null : wallet,
    lastKnownWallet: wallet,
    isStale: Boolean(error && wallet),
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
