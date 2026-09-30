/**
 * Resizes a photo in the browser before upload so full-resolution camera files
 * (often 10–20 MB) never leave the device. The image keeps its own shape —
 * nothing is cropped — and phone rotation (EXIF orientation) is applied.
 */
export async function resizeToJpeg(file: File, maxEdge = 2400, quality = 0.86): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error(
      `Couldn't read ${file.name}. If it's a HEIC photo from an iPhone, export it as JPEG first (or use Safari).`,
    );
  }

  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot process images.');

  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image conversion failed.'))), 'image/jpeg', quality),
  );
}
