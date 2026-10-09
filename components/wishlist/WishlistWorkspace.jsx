"use client";

import { useCallback, useEffect, useState } from "react";
import ProductTiles from "./ProductTiles";
import ShareWishlistDialog from "./ShareWishlistDialog";

export default function WishlistWorkspace() {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState("");
  const [name, setName] = useState("");
  const [boardTitle, setBoardTitle] = useState("");
  const [sharing, setSharing] = useState(null);
  const [catalogue, setCatalogue] = useState(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/wishlists", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    setCustomers(data.customers); setProducts(data.products);
    setSelected(id => data.customers.some(c => c.id === id) ? id : data.customers[0]?.id ?? "");
  }, []);
  useEffect(() => { load().catch(err => setError(err.message)).finally(() => setLoading(false)); }, [load]);

  const customer = customers.find(c => c.id === selected);
  const boardProducts = board => products.filter(p => board.customer_board_items.some(i => i.product_id === p.id));

  async function mutate(body) {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/wishlists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      await load();
      return true;
    } catch (err) { setError(err.message || "Couldn't save this change. Please try again."); return false; }
    finally { setBusy(false); }
  }
  async function browse(board) {
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/wishlists?catalogue=1&q=${encodeURIComponent(search)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setCatalogue({ board, products: data.products });
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <div className="sentry-block mx-auto w-full max-w-6xl px-4 py-8 text-stone-900 md:px-8">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">For your customers</p>
    <h1 className="mt-2 text-3xl font-semibold">Customer wishlists</h1>
    <p className="mt-2 text-sm text-stone-500">Collect designs into boards and share a limited viewing link.</p>
    {error && <div role="alert" className="my-5 flex items-center justify-between gap-4 rounded-xl bg-red-50 p-4 text-sm text-red-800"><span>{error}</span><button disabled={busy} onClick={() => load().then(() => setError("")).catch(err => setError(err.message))} className="underline">Retry</button></div>}
    <form className="my-6 flex flex-wrap gap-3" onSubmit={async e => { e.preventDefault(); if (await mutate({ action: "add_customer", name })) setName(""); }}>
      <input required maxLength={120} value={name} onChange={e => setName(e.target.value)} placeholder="Customer name" aria-label="New customer name" className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white p-3 text-sm" />
      <button disabled={busy || loading} className="rounded-xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">Add customer</button>
    </form>
    {loading ? <p role="status" className="py-12 text-center text-stone-500">Loading wishlists…</p> : customers.length === 0 ?
      <div className="rounded-2xl border border-dashed border-stone-300 p-12 text-center"><h2 className="font-semibold">Start your first customer wishlist</h2><p className="mt-2 text-sm text-stone-500">Add a customer above, then save designs to their board.</p></div> : <>
      <label className="block max-w-md text-sm font-medium">Customer
        <select value={selected} onChange={e => { setSelected(e.target.value); setCatalogue(null); }} className="mt-2 w-full rounded-xl border border-stone-300 bg-white p-3">{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      </label>
      {customer && <>
        <form className="my-6 flex gap-3" onSubmit={async e => { e.preventDefault(); if (await mutate({ action: "add_board", customer_id: customer.id, title: boardTitle })) setBoardTitle(""); }}>
          <input required maxLength={80} value={boardTitle} onChange={e => setBoardTitle(e.target.value)} placeholder="New board title" aria-label="New board title" className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white p-3 text-sm" />
          <button disabled={busy} className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm disabled:opacity-50">Add board</button>
        </form>
        <div className="space-y-8">{customer.customer_boards.map(board => <section key={board.id} className="rounded-3xl border border-stone-200 bg-stone-50 p-4 md:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">{board.title}</h2><p className="mt-1 text-xs text-stone-500">{boardProducts(board).length} published designs</p></div>
            <div className="flex gap-2"><button disabled={busy} onClick={() => browse(board)} className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm disabled:opacity-50">Add designs</button><button disabled={boardProducts(board).length === 0 || busy} onClick={() => setSharing(board)} className="rounded-xl bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-40">Share wishlist</button></div>
          </div>
          {boardProducts(board).length === 0 ? <p className="py-8 text-center text-sm text-stone-500">Add designs to share this wishlist.</p> : <ProductTiles products={boardProducts(board)} action={product => <button disabled={busy} onClick={() => mutate({ action: "set_design", board_id: board.id, product_id: product.id, saved: false })} className="text-xs text-red-700 disabled:opacity-50">Remove from board</button>} />}
        </section>)}</div>
      </>}
    </>}
    {catalogue && <section className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Add designs to {catalogue.board.title}</h2><button onClick={() => setCatalogue(null)} className="text-sm underline">Close</button></div>
      <form className="my-4 flex gap-3" onSubmit={e => { e.preventDefault(); browse(catalogue.board); }}><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search design titles" aria-label="Search designs" className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white p-3 text-sm" /><button disabled={busy} className="rounded-xl border border-stone-300 bg-white px-4 text-sm">Search</button></form>
      <ProductTiles products={catalogue.products} action={product => {
        const currentBoard = customer?.customer_boards.find(b => b.id === catalogue.board.id);
        const saved = currentBoard?.customer_board_items.some(i => i.product_id === product.id);
        return <button disabled={busy || saved} onClick={() => mutate({ action: "set_design", board_id: catalogue.board.id, product_id: product.id, saved: true })} className="rounded-lg bg-stone-900 px-3 py-2 text-xs text-white disabled:opacity-40">{saved ? "Saved" : "Save to board"}</button>;
      }} />
      {catalogue.products.length === 0 && <p className="py-8 text-center text-sm text-stone-500">No published designs found.</p>}
    </section>}
    {sharing && <ShareWishlistDialog key={sharing.id} board={sharing} onClose={() => setSharing(null)} />}
  </div>;
}
