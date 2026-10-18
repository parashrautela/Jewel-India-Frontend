"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import SharedDesigns from "./SharedDesigns";
import { TOKEN, UUID, remainingSessionMs, wishlistResponse } from "../../lib/wishlist/contract.mjs";

// Copy per link kind. Catalogue links are a wholesaler's hand-picked designs.
const COPY = {
  wishlist: { path: "/share/wishlist", heading: "A wishlist for you", intro: "Explore designs selected by your jewellery store. No sign-in needed.",
    open: "Open wishlist", unavailable: "This link is unavailable. Ask the store for a new wishlist link.",
    failed: "Couldn't open this wishlist. Please try again.", sender: "your jewellery store", ended: "Your viewing session has ended. Ask the store for a new link." },
  catalogue: { path: "/share/catalogue", heading: "Designs for you", intro: "Explore designs selected by your jeweller. No sign-in needed.",
    open: "View designs", unavailable: "This link is unavailable. Ask your jeweller for a new link.",
    failed: "Couldn't open these designs. Please try again.", sender: "your jeweller", ended: "Your viewing session has ended. Ask your jeweller for a new link." },
};

export default function SharedWishlist({ kind = "wishlist" }) {
  const copy = COPY[kind] ?? COPY.wishlist;
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
      else if (!TOKEN.test(rawToken)) setNotice(copy.unavailable);
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
  }, [loadContent, copy]);

  useEffect(() => {
    if (!view) return;
    const tick = () => {
      const remaining = remainingSessionMs(view.expires_at, view.server_now, view.receivedAt);
      setSeconds(Math.ceil(remaining / 1000));
      if (remaining <= 0) { generation.current += 1; setView(null); setNotice(copy.ended); }
    };
    const initial = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => { clearTimeout(initial); clearInterval(timer); };
  }, [view, copy]);

  async function claim() {
    if (busy || !ready || !token) return;
    setBusy(true); setNotice("");
    try {
      const res = await fetch("/api/shared-wishlist/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      const data = await wishlistResponse(res);
      if (!UUID.test(data.share_id ?? "")) throw new Error(copy.failed);
      session.current = data.share_id;
      window.history.replaceState(null, "", `${copy.path}?session=${data.share_id}`);
      setToken(""); await loadContent();
    } catch (err) { setNotice(err.message || copy.failed); }
    finally { setBusy(false); }
  }

  return <main className="sentry-block min-h-screen bg-[#FAF8F4] px-4 py-6 text-stone-900 sm:py-8 md:px-8 md:py-12">
    <div className="mx-auto max-w-6xl">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-800">Jewel India</p>
      {view ? <>
        <SharedDesigns view={view} seconds={seconds} sender={copy.sender} />
      </> : <div className="mx-auto mt-16 max-w-md rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-3xl font-semibold">{copy.heading}</h1>
        <p className="mt-4 text-sm leading-relaxed text-stone-500">{copy.intro}</p>
        {token && <><p className="mt-4 text-sm text-stone-600">Opening uses one viewing slot. Your session lasts up to 30 minutes, or until the link expires.</p><button disabled={!ready || busy} onClick={claim} className="mt-6 w-full rounded-xl bg-stone-900 p-3 font-semibold text-white disabled:opacity-50">{busy ? "Opening…" : copy.open}</button></>}
        {notice && <p role="alert" className="mt-5 text-sm text-stone-600">{notice}</p>}
        {session.current && <button disabled={busy} onClick={loadContent} className="mt-4 text-sm underline">Check access again</button>}
        {!ready && !notice && <p role="status" className="mt-5 text-sm text-stone-500">Preparing link…</p>}
      </div>}
      <p className="mt-8 text-center text-xs text-stone-500">A viewing link from Jewel India · Read-only access</p>
    </div>
  </main>;
}
