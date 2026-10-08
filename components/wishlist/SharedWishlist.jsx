"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ProductTiles from "./ProductTiles";
import { TOKEN, UUID, remainingSessionMs, wishlistResponse } from "../../lib/wishlist/contract.mjs";

export default function SharedWishlist() {
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState(null);
  const [notice, setNotice] = useState("");
  const [seconds, setSeconds] = useState(0);
  const session = useRef("");
  const generation = useRef(0);

  const loadContent = useCallback(async () => {
    if (!session.current || document.hidden) return;
    const version = generation.current;
    try {
      const res = await fetch(`/api/shared-wishlist?session=${session.current}`, { cache: "no-store" });
      const data = await wishlistResponse(res);
      if (generation.current !== version || document.hidden) return;
      setView({ ...data, receivedAt: Date.now() }); setNotice("");
    } catch (err) {
      if (generation.current === version) { setView(null); setNotice(err.message || "Couldn't check access. Please reconnect and try again."); }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const rawToken = window.location.hash.slice(1);
    const id = new URLSearchParams(window.location.search).get("session");
    if (UUID.test(id ?? "")) session.current = id;
    fetch("/api/shared-wishlist/bootstrap", { cache: "no-store" }).then(async res => {
      if (!res.ok) throw new Error("Couldn't prepare this link. Please try again.");
      if (cancelled) return;
      setToken(TOKEN.test(rawToken) ? rawToken : ""); setReady(true);
      if (session.current) await loadContent();
      else if (!TOKEN.test(rawToken)) setNotice("This link is unavailable. Ask the store for a new wishlist link.");
    }).catch(err => { if (!cancelled) setNotice(err.message); });

    const onVisibility = () => {
      generation.current += 1; setView(null);
      if (!document.hidden) loadContent();
    };
    const onPageHide = () => { generation.current += 1; setView(null); };
    const onPageShow = event => { if (event.persisted) { generation.current += 1; setView(null); loadContent(); } };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    const poll = setInterval(loadContent, 10000);
    return () => { cancelled = true; generation.current += 1; clearInterval(poll); document.removeEventListener("visibilitychange", onVisibility); window.removeEventListener("pagehide", onPageHide); window.removeEventListener("pageshow", onPageShow); };
  }, [loadContent]);

  useEffect(() => {
    if (!view) return;
    const tick = () => {
      const remaining = remainingSessionMs(view.expires_at, view.server_now, view.receivedAt);
      setSeconds(Math.ceil(remaining / 1000));
      if (remaining <= 0) { generation.current += 1; setView(null); setNotice("Your viewing session has ended. Ask the store for a new link."); }
    };
    const initial = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => { clearTimeout(initial); clearInterval(timer); };
  }, [view]);

  async function claim() {
    if (busy || !ready || !token) return;
    setBusy(true); setNotice("");
    try {
      const res = await fetch("/api/shared-wishlist/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      const data = await wishlistResponse(res);
      if (!UUID.test(data.share_id ?? "")) throw new Error("Couldn't open this wishlist. Please try again.");
      session.current = data.share_id;
      window.history.replaceState(null, "", `/share/wishlist?session=${data.share_id}`);
      setToken(""); await loadContent();
    } catch (err) { setNotice(err.message || "Couldn't open this wishlist. Please try again."); }
    finally { setBusy(false); }
  }

  return <main className="sentry-block min-h-screen bg-[#FAF8F4] px-4 py-8 text-stone-900 md:px-8 md:py-12">
    <div className="mx-auto max-w-5xl">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-800">Jewel India</p>
      {view ? <>
        <div className="mb-8 mt-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-stone-500">Shared by {view.store_name || "your jewellery store"}</p><h1 className="mt-2 text-3xl font-semibold">{view.title}</h1></div><p role="timer" className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600">Session ends in {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</p></div>
        <ProductTiles products={view.products} />
      </> : <div className="mx-auto mt-16 max-w-md rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-3xl font-semibold">A wishlist for you</h1>
        <p className="mt-4 text-sm leading-relaxed text-stone-500">Explore designs selected by your jewellery store. No sign-in needed.</p>
        {token && <><p className="mt-4 text-sm text-stone-600">Opening uses one viewing slot. Your session lasts up to 30 minutes, or until the link expires.</p><button disabled={!ready || busy} onClick={claim} className="mt-6 w-full rounded-xl bg-stone-900 p-3 font-semibold text-white disabled:opacity-50">{busy ? "Opening…" : "Open wishlist"}</button></>}
        {notice && <p role="alert" className="mt-5 text-sm text-stone-600">{notice}</p>}
        {session.current && <button disabled={busy} onClick={loadContent} className="mt-4 text-sm underline">Check access again</button>}
        {!ready && !notice && <p role="status" className="mt-5 text-sm text-stone-500">Preparing link…</p>}
      </div>}
      <p className="mt-8 text-center text-xs text-stone-500">A viewing link from Jewel India · Read-only access</p>
    </div>
  </main>;
}
