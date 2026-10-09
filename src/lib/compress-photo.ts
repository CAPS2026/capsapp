/** Shrinks a photo on the device before it is uploaded: longest side 1600px,
 *  JPEG. A phone photo of several MB becomes a few hundred KB, so it uploads
 *  quickly even with weak signal. Browser only. */
export async function compressPhoto(file: File, maxSide = 1600, quality = 0.8): Promise<Blob> {
  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This device can't prepare photos.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  if ("close" in bitmap) (bitmap as ImageBitmap).close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("Could not prepare that photo.");
  return blob;
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      // Honours the phone's rotation, so a portrait photo isn't sideways.
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // fall through to the image element
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not read that photo."));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
