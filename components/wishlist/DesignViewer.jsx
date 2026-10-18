"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { safeImageUrl } from "../../lib/wishlist/contract.mjs";
import { productImage } from "./ProductTiles";

const MAX_ZOOM = 4;
const SWIPE_PX = 50;
const block = event => event.preventDefault();
const fullImage = product => safeImageUrl(product.full_image_url) ?? productImage(product);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Full-screen viewer for a shared set of designs: swipe or arrow keys to move,
 * pinch, wheel or double-tap to zoom, drag to pan while zoomed, Esc or × to close.
 */
export default function DesignViewer({ products, index, onIndexChange, onClose }) {
  const product = products[index];
  const count = products.length;
  const [zoom, setZoom] = useState({ scale: 1, x: 0, y: 0 });
  const [loaded, setLoaded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const lastTap = useRef(0);
  const closeButton = useRef(null);
  const stage = useRef(null);

  const go = useCallback(step => {
    if (count < 2) return;
    onIndexChange((index + step + count) % count);
  }, [count, index, onIndexChange]);

  // Reset zoom and loading state whenever a different design is shown (adjusting state during render).
  const [shown, setShown] = useState(index);
  if (shown !== index) { setShown(index); setZoom({ scale: 1, x: 0, y: 0 }); setLoaded(false); }

  // Scroll lock, focus handling and keyboard control while open.
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const onKey = event => {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowRight") go(1);
      else if (event.key === "ArrowLeft") go(-1);
      else if (event.key === "Tab") { event.preventDefault(); closeButton.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [go, onClose]);

  // Warm the neighbours so swiping feels instant.
  useEffect(() => {
    for (const step of [1, -1]) {
      const neighbour = products[(index + step + count) % count];
      const src = neighbour && fullImage(neighbour);
      if (src) { const image = new Image(); image.referrerPolicy = "no-referrer"; image.src = src; }
    }
  }, [count, index, products]);

  const zoomAt = (scale, clientX, clientY) => setZoom(current => {
    const next = clamp(scale, 1, MAX_ZOOM);
    if (next === 1) return { scale: 1, x: 0, y: 0 };
    const rect = stage.current?.getBoundingClientRect();
    if (!rect) return { ...current, scale: next };
    // Keep the point under the finger/cursor still while zooming.
    const px = clientX - rect.left - rect.width / 2, py = clientY - rect.top - rect.height / 2;
    const ratio = next / current.scale;
    return { scale: next, x: px - (px - current.x) * ratio, y: py - (py - current.y) * ratio };
  });

  const onPointerDown = event => {
    // Capture keeps a drag going outside the stage; some browsers refuse it, which must not break the gesture.
    try { stage.current?.setPointerCapture(event.pointerId); } catch { /* keep going without capture */ }
    setDragging(true);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointers.current.values()];
    if (points.length === 2) {
      gesture.current = { type: "pinch", distance: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y), scale: zoom.scale };
    } else if (points.length === 1) {
      gesture.current = { type: zoom.scale > 1 ? "pan" : "swipe", startX: event.clientX, startY: event.clientY, x: zoom.x, y: zoom.y };
    }
  };
  const onPointerMove = event => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const g = gesture.current;
    if (!g) return;
    if (g.type === "pinch" && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      zoomAt(g.scale * Math.hypot(a.x - b.x, a.y - b.y) / g.distance, (a.x + b.x) / 2, (a.y + b.y) / 2);
    } else if (g.type === "pan") {
      setZoom(current => ({ ...current, x: g.x + event.clientX - g.startX, y: g.y + event.clientY - g.startY }));
    }
  };
  const onPointerUp = event => {
    const g = gesture.current;
    pointers.current.delete(event.pointerId);
    if ((g?.type === "swipe" || g?.type === "pan") && pointers.current.size === 0) {
      const dx = event.clientX - g.startX, dy = event.clientY - g.startY;
      const tapped = Math.abs(dx) < 10 && Math.abs(dy) < 10;
      if (tapped) {
        // A double tap zooms in, or back out when already zoomed.
        const now = event.timeStamp;
        if (now - lastTap.current < 300) { zoomAt(zoom.scale > 1 ? 1 : 2.5, event.clientX, event.clientY); lastTap.current = 0; }
        else lastTap.current = now;
      } else if (g.type === "swipe" && Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
        go(dx < 0 ? 1 : -1);
      }
    }
    if (pointers.current.size === 0) { gesture.current = null; setDragging(false); }
    else if (pointers.current.size === 1 && g?.type === "pinch") {
      const [p] = [...pointers.current.values()];
      gesture.current = { type: "pan", startX: p.x, startY: p.y, x: zoom.x, y: zoom.y };
    }
  };
  const onWheel = event => zoomAt(zoom.scale * (event.deltaY < 0 ? 1.15 : 1 / 1.15), event.clientX, event.clientY);

  if (!product) return null;
  const src = fullImage(product);
  const title = product.title || product.jewellery_type || "Jewellery design";

  return <div role="dialog" aria-modal="true" aria-label={`${title}, design ${index + 1} of ${count}`}
    className="fixed inset-0 z-50 flex flex-col bg-black text-white">
    <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold sm:text-base">{title}</p>
        {count > 1 && <p className="text-xs text-white/60">{index + 1} / {count}</p>}
      </div>
      <button ref={closeButton} type="button" onClick={onClose} aria-label="Close"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-2xl leading-none hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white">×</button>
    </div>

    <div ref={stage} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
      onWheel={onWheel} onContextMenu={block}
      className="relative flex min-h-0 flex-1 touch-none select-none items-center justify-center overflow-hidden">
      {!loaded && src && <div aria-hidden className="absolute h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />}
      {src ?
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src} src={src} alt={title} referrerPolicy="no-referrer" draggable={false} onLoad={() => setLoaded(true)}
          style={{ transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})` }}
          className={`max-h-full max-w-full object-contain duration-300 ${loaded ? "opacity-100" : "opacity-0"} ${dragging ? "transition-opacity" : "transition-[opacity,transform]"}`} /> :
        <p className="text-sm text-white/70">Image unavailable</p>}
      {count > 1 && <>
        <button type="button" onClick={() => go(-1)} aria-label="Previous design"
          className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl hover:bg-white/20 md:flex">‹</button>
        <button type="button" onClick={() => go(1)} aria-label="Next design"
          className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl hover:bg-white/20 md:flex">›</button>
      </>}
    </div>

    <p className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 text-center text-xs text-white/50">
      {zoom.scale > 1 ? "Drag to look around · double-tap to reset" : count > 1 ? "Swipe for more · pinch or double-tap to zoom" : "Pinch or double-tap to zoom"}
    </p>
  </div>;
}
