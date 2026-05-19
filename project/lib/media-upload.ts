import { supabase } from './supabase';

export type MediaType = 'image' | 'video' | 'reel';

export interface UploadResult {
  url: string;
  mediaType: MediaType;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
}

export interface UploadOptions {
  bucket?: 'media' | 'albums' | 'avatars';
  folder?: string;
  maxImageSize?: number;   // bytes, default 10MB
  maxVideoSize?: number;   // bytes, default 50MB
  maxImageWidth?: number;  // px, default 1920
  imageQuality?: number;   // 0-1, default 0.85
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

const DEFAULT_MAX_IMAGE_SIZE = 10 * 1024 * 1024;   // 10MB
const DEFAULT_MAX_VIDEO_SIZE = 50 * 1024 * 1024;    // 50MB
const DEFAULT_MAX_IMAGE_WIDTH = 1920;
const DEFAULT_IMAGE_QUALITY = 0.85;

/**
 * Detect media type from file
 */
export function getMediaType(file: File): MediaType {
  if (IMAGE_TYPES.includes(file.type)) return 'image';
  if (VIDEO_TYPES.includes(file.type)) return 'video';
  throw new Error(`Unsupported file type: ${file.type}`);
}

/**
 * Validate file before upload
 */
export function validateFile(file: File, options: UploadOptions = {}): string | null {
  const maxImageSize = options.maxImageSize || DEFAULT_MAX_IMAGE_SIZE;
  const maxVideoSize = options.maxVideoSize || DEFAULT_MAX_VIDEO_SIZE;

  const isImage = IMAGE_TYPES.includes(file.type);
  const isVideo = VIDEO_TYPES.includes(file.type);

  if (!isImage && !isVideo) {
    return `Unsupported file type. Allowed: JPEG, PNG, WebP, MP4, MOV, WebM`;
  }

  if (isImage && file.size > maxImageSize) {
    return `Image too large. Maximum ${Math.round(maxImageSize / 1024 / 1024)}MB allowed.`;
  }

  if (isVideo && file.size > maxVideoSize) {
    return `Video too large. Maximum ${Math.round(maxVideoSize / 1024 / 1024)}MB allowed.`;
  }

  return null;
}

/**
 * Compress an image file by resizing and re-encoding as JPEG
 */
export async function compressImage(
  file: File,
  maxWidth: number = DEFAULT_MAX_IMAGE_WIDTH,
  quality: number = DEFAULT_IMAGE_QUALITY
): Promise<{ blob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Only downscale, never upscale
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }
          resolve({ blob, width, height });
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Generate a thumbnail from a video file
 */
export async function generateVideoThumbnail(
  file: File,
  seekTime: number = 1
): Promise<{ thumbnailBlob: Blob; width: number; height: number; duration: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(seekTime, video.duration / 2);
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      const width = Math.min(video.videoWidth, 640);
      const height = Math.round((video.videoHeight * width) / video.videoWidth);
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas context not available'));
        return;
      }

      ctx.drawImage(video, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (!blob) {
            reject(new Error('Failed to generate thumbnail'));
            return;
          }
          resolve({
            thumbnailBlob: blob,
            width: video.videoWidth,
            height: video.videoHeight,
            duration: video.duration,
          });
        },
        'image/jpeg',
        0.7
      );
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video'));
    };

    video.src = url;
  });
}

/**
 * Generate a unique file path for storage
 */
function generateFilePath(userId: string, folder: string, file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `${userId}/${folder}/${timestamp}-${random}.${ext}`;
}

/**
 * Upload a single media file to Supabase Storage
 * Handles image compression and video thumbnail generation automatically
 */
export async function uploadMedia(
  file: File,
  userId: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const bucket = options.bucket || 'media';
  const folder = options.folder || 'posts';
  const maxWidth = options.maxImageWidth || DEFAULT_MAX_IMAGE_WIDTH;
  const quality = options.imageQuality || DEFAULT_IMAGE_QUALITY;

  // Validate
  const error = validateFile(file, options);
  if (error) throw new Error(error);

  const mediaType = getMediaType(file);
  let uploadBlob: Blob | File = file;
  let width: number | undefined;
  let height: number | undefined;
  let durationSeconds: number | undefined;
  let thumbnailUrl: string | undefined;

  if (mediaType === 'image') {
    // Compress image
    try {
      const compressed = await compressImage(file, maxWidth, quality);
      uploadBlob = compressed.blob;
      width = compressed.width;
      height = compressed.height;
    } catch {
      // If compression fails, upload original
      uploadBlob = file;
    }
  } else if (mediaType === 'video') {
    // Generate thumbnail
    try {
      const thumbResult = await generateVideoThumbnail(file);
      width = thumbResult.width;
      height = thumbResult.height;
      durationSeconds = thumbResult.duration;

      // Upload thumbnail
      const thumbPath = generateFilePath(userId, `${folder}/thumbs`, new File([thumbResult.thumbnailBlob], 'thumb.jpg'));
      const { error: thumbError } = await supabase.storage
        .from(bucket)
        .upload(thumbPath, thumbResult.thumbnailBlob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (!thumbError) {
        const { data: thumbUrl } = supabase.storage.from(bucket).getPublicUrl(thumbPath);
        thumbnailUrl = thumbUrl.publicUrl;
      }
    } catch {
      // Thumbnail generation failed, proceed without
    }
  }

  // Upload main file
  const filePath = generateFilePath(userId, folder, file);
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, uploadBlob, {
      contentType: mediaType === 'image' ? 'image/jpeg' : file.type,
      upsert: false,
    });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return {
    url: urlData.publicUrl,
    mediaType,
    thumbnailUrl,
    width,
    height,
    durationSeconds,
  };
}

/**
 * Upload multiple media files
 */
export async function uploadMultipleMedia(
  files: File[],
  userId: string,
  options: UploadOptions = {},
  onProgress?: (completed: number, total: number) => void
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const result = await uploadMedia(files[i], userId, options);
    results.push(result);
    onProgress?.(i + 1, files.length);
  }

  return results;
}

/**
 * Create a preview URL for a file (for local display before upload)
 */
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revoke a preview URL to free memory
 */
export function revokePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}
