/**
 * UrjaSetu 2.0 — Image Processing & Persistent Storage Utilities
 * 
 * ARCHITECTURAL NOTICE:
 * In the frontend demo environment, images are converted to optimized
 * Base64 Data URLs so they persist in localStorage and sync across browser tabs
 * via dataService.
 * 
 * In production:
 * - This utility will be superseded by Supabase Storage direct signed uploads
 *   (e.g., supabase.storage.from('hazard-photos').upload(...)).
 * - Images will be stored in cloud object storage and complaints will store
 *   secure HTTPS URLs.
 */

export const MAX_PHOTOS_PER_COMPLAINT = 4;
export const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024; // 10MB per file
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

/**
 * Formats byte size into human-readable text.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Validates file type and size.
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const type = file.type.toLowerCase();
  const isTypeValid = ALLOWED_IMAGE_TYPES.includes(type) || /\.(jpe?g|png|webp)$/i.test(file.name);

  if (!isTypeValid) {
    return {
      valid: false,
      error: `"${file.name}" is not a supported format. Please upload JPG, PNG, or WEBP images.`,
    };
  }

  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    return {
      valid: false,
      error: `"${file.name}" exceeds 10MB. Please choose a smaller file.`,
    };
  }

  return { valid: true };
}

/**
 * Converts a File into an optimized Base64 Data URL.
 * Automatically scales high-resolution camera photos down to a reasonable max dimension
 * (e.g. 960px) to prevent exceeding browser localStorage quotas (~5MB).
 */
export function fileToDataUrl(
  file: File,
  maxDimension = 960,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    // 1. Initial file reader
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error(`Failed to read file "${file.name}".`));
    };

    reader.onload = () => {
      const rawDataUrl = reader.result as string;

      // If running on server or no canvas support, resolve raw
      if (typeof window === "undefined" || typeof document === "undefined") {
        resolve(rawDataUrl);
        return;
      }

      // 2. Load into HTML Image for proportional scaling
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // If image is already smaller than maxDimension, resolve compressed
        if (width <= maxDimension && height <= maxDimension && file.size < 200 * 1024) {
          resolve(rawDataUrl);
          return;
        }

        // Calculate proportional dimensions
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        // Draw to off-screen canvas
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          // Fallback to raw data URL if 2D context fails
          resolve(rawDataUrl);
          return;
        }

        // Fill background with white to handle transparent PNGs when converting to image/jpeg
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to optimized JPEG data URL
        try {
          const optimizedDataUrl = canvas.toDataURL("image/jpeg", quality);
          if (optimizedDataUrl && optimizedDataUrl.startsWith("data:image/")) {
            resolve(optimizedDataUrl);
          } else {
            resolve(rawDataUrl);
          }
        } catch {
          resolve(rawDataUrl);
        }
      };

      img.onerror = () => {
        // Fallback to raw data URL on decode error
        resolve(rawDataUrl);
      };

      img.src = rawDataUrl;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Returns a clean, high-resolution SVG Data URL representing municipal electrical hazard evidence.
 * Used as a reliable fallback whenever an image URL fails to load or for pre-seeded demo records.
 */
export function getHazardFallbackSvg(label = "Hazard Evidence"): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
    <rect width="400" height="300" fill="#EAF3F5"/>
    <rect x="15" y="15" width="370" height="270" rx="12" fill="#ffffff" stroke="#087E8B" stroke-width="2" stroke-dasharray="6,4" opacity="0.6"/>
    <circle cx="200" cy="115" r="42" fill="#173F5F"/>
    <path d="M198 90 L186 118 L198 118 L194 142 L214 114 L202 114 Z" fill="#F4A261" stroke="#F4A261" stroke-width="1.5" stroke-linejoin="round"/>
    <text x="200" y="185" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" fill="#173F5F">${label}</text>
    <text x="200" y="208" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#263238" opacity="0.75">UrjaSetu Citizen Ground Verification</text>
    <rect x="130" y="225" width="140" height="24" rx="12" fill="#087E8B" opacity="0.15"/>
    <text x="200" y="241" text-anchor="middle" font-family="monospace" font-size="10" font-weight="600" fill="#087E8B">✓ Evidence Logged</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const DEFAULT_HAZARD_FALLBACK_URL = getHazardFallbackSvg("Hazard Evidence");
