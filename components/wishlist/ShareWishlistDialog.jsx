"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export default function ShareWishlistDialog({ board, onClose }) {
  const dialog = useRef(null);
  const [viewers, setViewers] = useState(1);
  const [minutes, setMinutes] = useState(1440);
  const [shares, setShares] = useState([]);
  const [created, setCreated] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [canShare, setCanShare] = useState(false);

  const loadShares = useCallback(async () => {
    const res = await fetch(`/api/wishlist-shares?board_id=${board.id}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    setShares(data.shares);
  }, [board.id]);

  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    loadShares().then(() => setCanShare(Boolean(navigator.share))).catch(() => setError("Couldn't load existing links. Please try again."));
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(timer); element.close(); };
  }, [loadShares]);

  async function create(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setNotice(""); setCreated(null);
    try {
      const res = await fetch("/api/wishlist-shares", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board_id: board.id, max_viewers: Number(viewers), duration_minutes: Number(minutes) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setCreated({ ...data, url: new URL(data.link_path, window.location.origin).href });
      await loadShares();
    } catch (err) { setError(err.message || "Couldn't create this link. Please try again."); }
    finally { setBusy(false); }
  }

  async function revoke(id) {
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/wishlist-shares/${id}/revoke`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).message);
      if (created?.id === id) setCreated(null);
      await loadShares();
      setNotice("Link revoked. Further access is blocked.");
    } catch (err) { setError(err.message || "Couldn't revoke this link."); }
    finally { setBusy(false); }
  }

  return <dialog ref={dialog} onCancel={onClose} className="sentry-block m-auto max-h-[90dvh] w-[min(94vw,580px)] overflow-y-auto rounded-3xl border border-stone-200 bg-white p-6 text-stone-900 shadow-2xl backdrop:bg-black/50">
    <div className="flex items-start justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-amber-800">Jewel India</p><h2 className="mt-2 text-2xl font-semibold">Share wishlist</h2><p className="mt-1 text-sm text-stone-500">{board.title}</p></div>
      <button onClick={onClose} aria-label="Close sharing dialog" className="rounded-full px-3 py-2 hover:bg-stone-100">✕</button>
    </div>
    <p className="my-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">No sign-in needed. Each browser gets one viewing session, lasting up to 30 minutes. Opening the wishlist uses a slot.</p>
    <form onSubmit={create} className="space-y-4">
      <label className="block text-sm font-medium">Maximum viewers
        <input autoFocus required type="number" min="1" max="100" value={viewers} onChange={e => setViewers(e.target.value)} className="mt-2 w-full rounded-xl border border-stone-300 p-3" />
      </label>
      <label className="block text-sm font-medium">Link validity
        <select value={[60, 1440, 10080].includes(Number(minutes)) ? minutes : "custom"} onChange={e => setMinutes(e.target.value === "custom" ? 30 : Number(e.target.value))} className="mt-2 w-full rounded-xl border border-stone-300 p-3">
          <option value="60">1 hour</option><option value="1440">24 hours</option><option value="10080">7 days</option><option value="custom">Custom duration</option>
        </select>
      </label>
      {![60, 1440, 10080].includes(Number(minutes)) && <label className="block text-sm font-medium">Minutes (5–10,080)
        <input required type="number" min="5" max="10080" value={minutes} onChange={e => setMinutes(e.target.value)} className="mt-2 w-full rounded-xl border border-stone-300 p-3" />
      </label>}
      <p className="text-xs text-stone-500">Shares the designs currently on this board. Customer names, contact details, and notes stay private.</p>
      <button disabled={busy} className="w-full rounded-xl bg-stone-900 p-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Please wait…" : "Create new link"}</button>
    </form>
    {created && <div className="mt-5 space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <p className="text-sm font-medium">Your link is ready</p>
      <input readOnly aria-label="Shareable wishlist link" value={created.url} onFocus={e => e.target.select()} className="w-full rounded-lg border border-emerald-200 bg-white p-2 text-xs" />
      <p className="text-xs">Expires {new Date(created.expires_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p>
      <div className="flex gap-3">
        <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white" onClick={async () => {
          try { await navigator.clipboard.writeText(created.url); setNotice("Link copied."); } catch { setNotice("Select the link above to copy it."); }
        }}>Copy link</button>
        {canShare && <button className="rounded-lg border border-stone-300 px-4 py-2 text-sm" onClick={async () => {
          try { await navigator.share({ title: "A wishlist for you", url: created.url }); } catch { /* Dismissing the system sheet is normal. */ }
        }}>Share…</button>}
      </div>
      <p className="text-xs text-stone-600">Copy this link now. Existing link tokens are not stored for later retrieval.</p>
    </div>}
    {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="mt-4 text-sm text-emerald-800">{notice}</p>}
    <h3 className="mb-3 mt-6 font-semibold">Recent links</h3>
    {shares.length === 0 && <p className="text-sm text-stone-500">No links created yet.</p>}
    <ul className="space-y-3">{shares.map(share => {
      const expired = Date.parse(share.expires_at) <= now;
      const status = share.revoked_at ? "Revoked" : expired ? "Expired" : share.views_used >= share.max_viewers ? "All slots used" : "Active";
      return <li key={share.id} className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 p-3">
        <div><p className="text-sm font-medium">{status} · {share.views_used} / {share.max_viewers} slots used</p><p className="mt-1 text-xs text-stone-500">Expires {new Date(share.expires_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p></div>
        {!share.revoked_at && !expired && <button disabled={busy} onClick={() => revoke(share.id)} className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 disabled:opacity-50">Revoke</button>}
      </li>;
    })}</ul>
  </dialog>;
}
