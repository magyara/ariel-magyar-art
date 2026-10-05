import { IG_ASPECTS, IG_ASPECT_RATIO } from '../types';
import type { IgAspect, IgFit } from '../types';

const IG_WIDTH = 1080;
/** Photos within 1% of the post shape go up untouched — no padding, no crop. */
const MATCH_TOLERANCE = 0.01;

export interface IgRenderOptions {
  aspect: IgAspect;
  fit: IgFit;
  /** Crop position, 0–1 on each axis. */
  offsetX: number;
  offsetY: number;
  /** Hex color behind padded photos. */
  background: string;
}

export const matchesAspect = (imageRatio: number, aspect: IgAspect) =>
  Math.abs(imageRatio / IG_ASPECT_RATIO[aspect] - 1) <= MATCH_TOLERANCE;

/** The Instagram shape closest to a photo's own shape (compared on a log scale). */
export function closestAspect(imageRatio: number): IgAspect {
  return IG_ASPECTS.reduce((best, a) =>
    Math.abs(Math.log(imageRatio / IG_ASPECT_RATIO[a])) < Math.abs(Math.log(imageRatio / IG_ASPECT_RATIO[best]))
      ? a
      : best,
  );
}

export function measureImage(src: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth / img.naturalHeight);
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = src;
  });
}

async function loadBitmap(source: File | string): Promise<ImageBitmap> {
  let blob: Blob;
  if (typeof source === 'string') {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`Could not load ${source} (${res.status})`);
    blob = await res.blob();
  } else {
    blob = source;
  }
  return createImageBitmap(blob, { imageOrientation: 'from-image' });
}

/**
 * Renders the Instagram copy of a photo: a 1080px-wide JPEG at exactly the
 * chosen post shape. The site image itself is never modified.
 */
export async function renderIgImage(source: File | string, opts: IgRenderOptions): Promise<Blob> {
  const bitmap = await loadBitmap(source);
  const targetRatio = IG_ASPECT_RATIO[opts.aspect];
  const width = IG_WIDTH;
  const height = Math.round(width / targetRatio);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot process images.');
  ctx.imageSmoothingQuality = 'high';

  ctx.fillStyle = opts.background;
  ctx.fillRect(0, 0, width, height);

  const imageRatio = bitmap.width / bitmap.height;
  const cover = opts.fit === 'crop' && !matchesAspect(imageRatio, opts.aspect);
  // contain = whole photo visible (padded); cover = fills the frame (cropped).
  const scale = cover
    ? Math.max(width / bitmap.width, height / bitmap.height)
    : Math.min(width / bitmap.width, height / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  const x = cover ? (width - w) * opts.offsetX : (width - w) / 2;
  const y = cover ? (height - h) * opts.offsetY : (height - h) / 2;

  ctx.drawImage(bitmap, x, y, w, h);
  bitmap.close();

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image conversion failed.'))), 'image/jpeg', 0.9),
  );
}
