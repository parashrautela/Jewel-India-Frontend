'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { filterDesigns, validateImageFile } from '../../lib/catalogue/search.mjs';

export default function RetailerCatalogueSearch({ designs, isLoading = false, categoryOptions, renderCategories, renderResults }) {
  const [text, setText] = useState('');
  const [category, setCategory] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [matches, setMatches] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [skipped, setSkipped] = useState(0);
  const workerRef = useRef(null);
  const requestRef = useRef(0);
  const previewRef = useRef('');
  const inputRef = useRef(null);
  const busyRef = useRef(false);

  useEffect(() => () => {
    workerRef.current?.terminate();
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  const categories = useMemo(() => categoryOptions || [...new Set(designs.map(d => d.category?.trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b)).map(name => ({ name, slug: name })), [designs, categoryOptions]);
  const eligible = useMemo(() => filterDesigns(designs, category), [designs, category]);
  const visible = useMemo(() => {
    if (matches === null) return filterDesigns(designs, category, text);
    const lookup = new Map(eligible.map(design => [design.id, design]));
    return matches.map(match => lookup.get(match.id)).filter(Boolean);
  }, [designs, eligible, matches, category, text]);

  function resetSearch() {
    requestRef.current++;
    if (busyRef.current) { workerRef.current?.terminate(); workerRef.current = null; }
    busyRef.current = false;
    setBusy(false);
    setMatches(null);
    setProgress('');
    setError('');
    setSkipped(0);
  }
  function clearImage() {
    resetSearch();
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = '';
    setPreview('');
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
  }
  function chooseImage(event) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    resetSearch();
    try {
      validateImageFile(selected);
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = URL.createObjectURL(selected);
      setPreview(previewRef.current);
      setFile(selected);
      setText('');
    } catch (err) {
      setError(err.message);
      event.target.value = '';
    }
  }
  function searchImage() {
    if (!file || !category || busy || !eligible.length) return;
    setBusy(true);
    busyRef.current = true;
    setMatches(null);
    setSkipped(0);
    setError('');
    setProgress('Preparing image search…');
    const requestId = ++requestRef.current;
    try {
      if (!workerRef.current) workerRef.current = new Worker(new URL('../../lib/catalogue/imageSearch.worker.js', import.meta.url), { type: 'module' });
      workerRef.current.onmessage = ({ data }) => {
        if (data.requestId !== requestRef.current) return;
        if (data.type === 'progress') setProgress(`${data.message}${data.percent === undefined ? '' : ` · ${data.percent}%`}`);
        if (data.type === 'result' || data.type === 'error') {
          busyRef.current = false;
          setBusy(false);
          setProgress('');
          if (data.type === 'result') { setMatches(data.matches); setSkipped(data.skipped); }
          else setError(data.message);
        }
      };
      workerRef.current.onerror = () => {
        if (requestId !== requestRef.current) return;
        resetSearch();
        workerRef.current?.terminate();
        workerRef.current = null;
        setError('Image search could not start. Please reload and try again.');
      };
      workerRef.current.postMessage({ requestId, file, designs: eligible.map(({ id, image_url }) => ({ id, image_url })) });
    } catch {
      resetSearch();
      setError('Image search is not supported in this browser. Try an updated Chrome or Safari.');
    }
  }

  return <>
    <section aria-label="Search catalogue" className="rounded-[14px] border border-gray-200 bg-white p-4 md:p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-1 items-center gap-3 rounded-[10px] border border-gray-300 px-3 focus-within:ring-2 focus-within:ring-gray-900">
          <svg aria-hidden="true" className="h-5 w-5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="10.5" cy="10.5" r="6.5" strokeWidth="1.8"/><path d="m16 16 4 4" strokeWidth="1.8" strokeLinecap="round"/></svg>
          <input aria-label="Search designs by name or tag" placeholder="Search your catalogue…" value={text} disabled={!!file} onChange={event => { resetSearch(); setText(event.target.value); }} className="min-w-0 w-full py-3 text-sm outline-none disabled:bg-white disabled:text-gray-400" />
          <button type="button" aria-label="Choose image to search" title="Search by image" onClick={() => inputRef.current?.click()} className="shrink-0 rounded-lg p-2 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-gray-900">
            <svg aria-hidden="true" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="5" width="18" height="15" rx="3" strokeWidth="1.7"/><circle cx="12" cy="12" r="3.5" strokeWidth="1.7"/><path d="m8 5 1.5-2h5L16 5" strokeWidth="1.7"/></svg>
          </button>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Reference image" className="hidden" onChange={chooseImage} />
        </div>

        <select aria-label="Jewellery category" value={category} onChange={event => { resetSearch(); setCategory(event.target.value); }} className="rounded-[10px] border border-gray-300 px-3 py-3 text-sm bg-white sm:max-w-[220px]">
          <option value="">{file ? 'Select a category' : 'All categories'}</option>
          {categories.map(({ name, slug }) => <option key={slug} value={slug}>{name}</option>)}
        </select>
      </div>
      {file ? <div className="mt-4 flex flex-wrap items-center gap-4">
        {/* Object URL stays local and is revoked on replace, clear and unmount. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt="Image to search for" className="h-20 w-20 rounded-lg border border-gray-200 object-contain bg-gray-50" />
        <div className="min-w-0 flex-1 basis-40">
          <p className="text-sm font-semibold">Find a similar design</p>
          <p className="mt-1 text-xs text-gray-500">Choose a category, then search. Your reference image stays on this device.</p>
          <div className="mt-3 flex flex-wrap gap-3 items-center">
            <button type="button" onClick={searchImage} disabled={busy || !category || !eligible.length || isLoading} className="rounded-lg bg-[#111827] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{busy ? 'Searching…' : 'Search by image'}</button>
            {busy && <button type="button" onClick={resetSearch} className="text-sm underline">Cancel search</button>}
            <button type="button" onClick={() => inputRef.current?.click()} className="text-sm underline">Replace</button>
            <button type="button" onClick={clearImage} className="text-sm text-gray-500 underline">Clear image</button>
          </div>
        </div>
      </div> : <p className="mt-3 text-xs text-gray-500">Search by name or use the camera button to find similar jewellery. JPG, PNG or WebP, up to 10 MB.</p>}
      {busy && <p role="status" className="mt-4 text-sm text-gray-600">{progress}<span className="block mt-1 text-xs">The first search prepares the model and checks catalogue images. Following searches are faster.</span></p>}
      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      {skipped > 0 && <p role="status" className="mt-4 text-sm text-amber-800">{skipped} catalogue {skipped === 1 ? 'image could' : 'images could'} not be checked. Results may be incomplete.</p>}
      {matches !== null && <p role="status" className="mt-4 text-sm text-gray-600">{visible.length ? `${visible.length} close ${visible.length === 1 ? 'match' : 'matches'} found` : 'No close matches found in this category.'}</p>}
    </section>
    {/* The renderer attaches this callback to buttons; refs are read only on click. */}
    {/* eslint-disable-next-line react-hooks/refs */}
    {renderCategories?.(category || 'all', next => { resetSearch(); setCategory(next === 'all' ? '' : next); })}
    {renderResults(visible, busy)}
  </>;
}
