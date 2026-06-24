import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { logger } from '@/lib/logger';

export interface UploadResult {
  filename: string;
  url: string;
  width: number;
  height: number;
}

export interface UploadOptions {
  uploadDir: string;
  urlPrefix: string;
  allowedMimeTypes: string[];
  maxSize: number;
  userId?: string; // Included in filename for ownership validation
}

const MAGIC_BYTES: Record<string, Uint8Array[]> = {
  'image/jpeg': [new Uint8Array([0xff, 0xd8, 0xff])],
  'image/png': [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
  'image/webp': [new Uint8Array([0x52, 0x49, 0x46, 0x46])], // RIFF header, further check below
};

function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const signatures = MAGIC_BYTES[mimeType];
  if (!signatures) return false;

  return signatures.some((signature) => {
    if (mimeType === 'image/webp') {
      // WebP: RIFF....WEBP
      if (buffer.length < 12) return false;
      return (
        buffer.subarray(0, 4).toString() === 'RIFF' &&
        buffer.subarray(8, 12).toString() === 'WEBP'
      );
    }
    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) return false;
    }
    return true;
  });
}

export async function validateAndProcessImage(
  file: File,
  options: UploadOptions,
): Promise<UploadResult> {
  // Validate MIME type against whitelist
  if (!options.allowedMimeTypes.includes(file.type)) {
    throw new Error(`Invalid file type. Only ${options.allowedMimeTypes.join(', ')} are allowed`);
  }

  if (file.size > options.maxSize) {
    throw new Error(`File too large. Maximum size is ${options.maxSize / (1024 * 1024)}MB`);
  }

  if (file.size === 0) {
    throw new Error('Empty file');
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Validate magic bytes to prevent MIME type spoofing
  if (!validateMagicBytes(buffer, file.type)) {
    throw new Error('File content does not match declared type');
  }

  // Validate actual image content using sharp
  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch (err) {
    logger.error('upload.validateAndProcessImage', 'Sharp metadata extraction failed', err);
    throw new Error('Invalid image file');
  }

  if (!metadata.width || !metadata.height) {
    throw new Error('Unable to read image dimensions');
  }

  // Ensure upload directory exists
  if (!existsSync(options.uploadDir)) {
    mkdirSync(options.uploadDir, { recursive: true });
  }

  // Convert to WebP for optimal file size and consistent format
  const userIdPrefix = options.userId ? `${options.userId}-` : '';
  const filename = `${userIdPrefix}image-${randomUUID()}.webp`;
  const filePath = path.join(options.uploadDir, filename);

  const optimizedBuffer = await sharp(buffer)
    .webp({ quality: 80 })
    .toBuffer();

  writeFileSync(filePath, optimizedBuffer);

  const outputMetadata = await sharp(optimizedBuffer).metadata();

  return {
    filename,
    url: `${options.urlPrefix}${filename}`,
    width: outputMetadata.width ?? 0,
    height: outputMetadata.height ?? 0,
  };
}

export async function cleanupFile(filePath: string): Promise<void> {
  if (existsSync(filePath)) {
    try {
      unlinkSync(filePath);
    } catch (err) {
      logger.error('upload.cleanupFile', 'Failed to delete file', { filePath, error: err });
    }
  }
}
