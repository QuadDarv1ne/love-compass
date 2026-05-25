import { NextResponse } from 'next/server';
import { requireAuthWithCSRF } from '@/lib/auth/guard';
import { logger } from '@/lib/logger';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import path from 'path';
import { UPLOAD } from '@/lib/constants';

const MAX_FILE_SIZE = UPLOAD.MAX_FILE_SIZE;
const MAX_PHOTOS = UPLOAD.MAX_PHOTOS;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'photos');

function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthWithCSRF(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;
    const formData = await request.formData();
    const files = formData.getAll('photos') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    if (files.length > MAX_PHOTOS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_PHOTOS} photos per upload` },
        { status: 400 }
      );
    }

    const photoUrls: string[] = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed' },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: 'File too large. Maximum size is 5MB' },
          { status: 400 }
        );
      }

      ensureUploadDir();

      const ext = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp';
      const filename = `${user.id}-${randomUUID()}.${ext}`;
      const filePath = path.join(UPLOAD_DIR, filename);

      const buffer = Buffer.from(await file.arrayBuffer());
      writeFileSync(filePath, buffer);
      photoUrls.push(`/uploads/photos/${filename}`);
    }

    return NextResponse.json({ photos: photoUrls });
  } catch (error) {
    logger.error('/api/profile/photos', 'Failed to upload photos', error);
    return NextResponse.json({ error: 'Failed to upload photos' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAuthWithCSRF(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;
    const { searchParams } = new URL(request.url);
    const photoUrl = searchParams.get('url');

    if (!photoUrl) {
      return NextResponse.json({ error: 'No photo URL provided' }, { status: 400 });
    }

    // Validate ownership: photo must belong to the authenticated user
    const expectedPrefix = `/uploads/photos/${user.id}-`;
    if (!photoUrl.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Prevent path traversal: extract only the filename and use known-safe upload dir
    const filename = path.basename(photoUrl);
    if (!filename.startsWith(`${user.id}-`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const filePath = path.join(UPLOAD_DIR, filename);
    if (existsSync(filePath)) {
      try {
        unlinkSync(filePath);
      } catch {
        // Ignore deletion errors
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('/api/profile/photos', 'Failed to delete photo', error);
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 });
  }
}
