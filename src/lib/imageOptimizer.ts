/**
 * Client-side smart image optimizer for uploads.
 *
 * Rules:
 *  - If image size < 500 KB → upload as-is.
 *  - If image size is 500 KB–2 MB → convert to WebP (quality: 90%).
 *  - If image size > 2 MB → resize longest side to 3000px (only if larger), then convert to WebP (quality: 85%).
 *  - Preserve EXIF orientation.
 *  - Keep PNGs with transparency as PNG (do not convert to WebP if transparency would be affected).
 */

const SIZE_500_KB = 500 * 1024;
const SIZE_2_MB = 2 * 1024 * 1024;
const MAX_DIMENSION_2MB = 3000;

interface LoadedImage {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, dx: number, dy: number, dw: number, dh: number) => void;
  close?: () => void;
}

/**
 * Loads an image while preserving EXIF orientation.
 * Prefers createImageBitmap with imageOrientation: 'from-image' (hardware accelerated & spec-standard).
 * Falls back to HTMLImageElement which respects EXIF in all modern browsers.
 */
async function loadImagePreservingOrientation(file: File): Promise<LoadedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, dx, dy, dw, dh) => ctx.drawImage(bitmap, dx, dy, dw, dh),
        close: () => bitmap.close(),
      };
    } catch {
      // Fallback below
    }
  }

  return new Promise<LoadedImage>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        draw: (ctx, dx, dy, dw, dh) => ctx.drawImage(img, dx, dy, dw, dh),
      });
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Checks if a canvas context contains any transparent or semi-transparent pixels (alpha < 255).
 */
function hasTransparency(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const len = data.length;
    // Step through the alpha channel of every pixel
    for (let i = 3; i < len; i += 4) {
      if (data[i] < 255) {
        return true;
      }
    }
  } catch {
    // If getImageData fails, assume transparency to safely preserve PNG
    return true;
  }
  return false;
}

/**
 * Converts a filename's extension.
 */
function replaceExtension(filename: string, newExt: string): string {
  const dotIndex = filename.lastIndexOf(".");
  const baseName = dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
  return `${baseName}.${newExt.replace(/^\./, "")}`;
}

/**
 * Optimizes an image File based on size and format constraints.
 * Returns the optimized File, or the original File if optimization is not needed or fails.
 */
export async function optimizeImage(file: File): Promise<File> {
  // Only process images (skip audio, video, pdf, etc.)
  if (!file.type || !file.type.startsWith("image/")) {
    return file;
  }

  // Skip vector images and animated GIFs to prevent breaking them
  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    return file;
  }

  // Rule 1: If image size < 500 KB → upload as-is
  if (file.size < SIZE_500_KB) {
    return file;
  }

  try {
    const loaded = await loadImagePreservingOrientation(file);
    const { width, height } = loaded;

    if (!width || !height) {
      loaded.close?.();
      return file;
    }

    const isOver2MB = file.size > SIZE_2_MB;

    // Determine target dimensions
    let targetWidth = width;
    let targetHeight = height;

    if (isOver2MB) {
      const longest = Math.max(width, height);
      // Rule 3: resize the longest side to 3000px (only if larger)
      if (longest > MAX_DIMENSION_2MB) {
        const scale = MAX_DIMENSION_2MB / longest;
        targetWidth = Math.round(width * scale);
        targetHeight = Math.round(height * scale);
      }
    }

    // Prepare canvas
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (!ctx) {
      loaded.close?.();
      return file;
    }

    // High quality canvas rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    loaded.draw(ctx, 0, 0, targetWidth, targetHeight);
    loaded.close?.();

    // Rule 5: Keep PNGs with transparency as PNG
    const isPng = file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
    let isTransparentPng = false;
    if (isPng) {
      isTransparentPng = hasTransparency(ctx, targetWidth, targetHeight);
    }

    // Decide output format and quality:
    // If PNG with transparency -> keep as image/png
    // Otherwise:
    //  - If > 2 MB: WebP with quality 85%
    //  - If 500 KB–2 MB: WebP with quality 90%
    let targetMime: string;
    let targetQuality: number | undefined;
    let newFilename: string;

    if (isTransparentPng) {
      targetMime = "image/png";
      targetQuality = undefined; // PNG is lossless
      newFilename = file.name.toLowerCase().endsWith(".png") ? file.name : replaceExtension(file.name, "png");

      // If it's a transparent PNG between 500 KB and 2 MB that didn't need resizing,
      // return as-is to avoid re-encoding overhead
      if (!isOver2MB && targetWidth === width && targetHeight === height) {
        return file;
      }
    } else {
      targetMime = "image/webp";
      targetQuality = isOver2MB ? 0.85 : 0.90;
      newFilename = replaceExtension(file.name, "webp");
    }

    // Export canvas to blob
    const blob: Blob | null = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), targetMime, targetQuality);
    });

    if (!blob) {
      return file;
    }

    // Safeguard: If the resulting blob is somehow larger than the original, keep original
    if (blob.size >= file.size && targetWidth === width && targetHeight === height) {
      return file;
    }

    return new File([blob], newFilename, {
      type: targetMime,
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn("Client-side image optimization fallback to original:", err);
    return file;
  }
}
