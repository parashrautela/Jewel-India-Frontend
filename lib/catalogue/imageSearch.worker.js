import { AutoProcessor, CLIPVisionModelWithProjection, RawImage, env } from '@huggingface/transformers';
import { IMAGE_SEARCH_MODEL, MAX_IMAGE_BYTES, MAX_IMAGE_PIXELS, normalizeVector, rankMatches } from './search.mjs';

env.allowLocalModels = false;
env.backends.onnx.wasm.numThreads = 1;
let modelPromise;
const vectors = new Map();
let running = false;

async function getModel(onProgress) {
  if (!modelPromise) {
    modelPromise = Promise.all([
      AutoProcessor.from_pretrained(IMAGE_SEARCH_MODEL),
      CLIPVisionModelWithProjection.from_pretrained(IMAGE_SEARCH_MODEL, {
        device: 'wasm', dtype: 'q8',
        progress_callback: event => {
          if (event.status === 'progress') onProgress('Preparing image search', Math.round(event.progress || 0));
        },
      }),
    ]).catch(error => { modelPromise = null; throw error; });
  }
  return modelPromise;
}
async function embed(blob, processor, model) {
  // Decode with browser APIs first, impose limits and downsize before allocating model inputs.
  const bitmap = await createImageBitmap(blob);
  try {
    if (bitmap.width * bitmap.height > MAX_IMAGE_PIXELS) throw new Error('Image dimensions are too large.');
    const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
    const canvas = new OffscreenCanvas(Math.max(1, Math.round(bitmap.width * scale)), Math.max(1, Math.round(bitmap.height * scale)));
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const image = await RawImage.fromBlob(await canvas.convertToBlob({ type: 'image/png' }));
    const inputs = await processor(image);
    const { image_embeds } = await model(inputs);
    return normalizeVector(image_embeds.data);
  } finally { bitmap.close(); }
}
async function readCatalogueImage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!response.ok) throw new Error('Catalogue image unavailable.');
    if (Number(response.headers.get('content-length')) > MAX_IMAGE_BYTES) throw new Error('Catalogue image too large.');
    const reader = response.body.getReader();
    const chunks = [];
    let bytes = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_IMAGE_BYTES) { await reader.cancel(); throw new Error('Catalogue image too large.'); }
      chunks.push(value);
    }
    return new Blob(chunks, { type: response.headers.get('content-type') || 'image/jpeg' });
  } finally { clearTimeout(timer); }
}
self.onmessage = async ({ data }) => {
  if (running) return;
  running = true;
  const { requestId, file, designs } = data;
  const report = (message, percent) => self.postMessage({ requestId, type: 'progress', message, percent });
  try {
    const [processor, model] = await getModel(report);
    report('Reading your reference image');
    const query = await embed(file, processor, model);
    const candidates = [];
    let skipped = 0;
    for (let index = 0; index < designs.length; index++) {
      const design = designs[index];
      report(`Checking designs ${index + 1} of ${designs.length}`, Math.round(index / designs.length * 100));
      if (!design.image_url) { skipped++; continue; }
      const key = `${design.id}:${design.image_url}`;
      try {
        let vector = vectors.get(key);
        if (!vector) {
          vector = await embed(await readCatalogueImage(design.image_url), processor, model);
          if (vectors.size >= 1000) vectors.delete(vectors.keys().next().value);
          vectors.set(key, vector);
        }
        candidates.push({ id: design.id, vector });
      } catch { skipped++; }
    }
    if (!candidates.length) throw new Error('Catalogue images could not be searched. Check your connection and try again.');
    self.postMessage({ requestId, type: 'result', matches: rankMatches(query, candidates), checked: candidates.length, skipped });
  } catch (error) {
    self.postMessage({ requestId, type: 'error', message: error.message || 'Image search is unavailable. Please try again.' });
  } finally { running = false; }
};
