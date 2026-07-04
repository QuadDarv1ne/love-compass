import { NextResponse } from 'next/server';
import { requireAuthWithCSRF } from '@/lib/auth/guard';
import { logger } from '@/lib/logger';
import path from 'path';
import { UPLOAD } from '@/lib/constants';
import { validateAndProcessImage, cleanupFile } from '@/lib/upload';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'photos');

export async function POST(request: Request) {
  try {
    const auth = await requireAuthWithCSRF(request);
    if (auth instanceof NextResponse) return auth;

    const { user: _user } = auth;
    const formData = await request.formData();
    const files = formData.getAll('photos') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    if (files.length > UPLOAD.MAX_PHOTOS) {
      return NextResponse.json(
        { error: `Maximum ${UPLOAD.MAX_PHOTOS} photos per upload` },
        { status: 400 }
      );
    }

    const photoUrls: string[] = [];

    for (const file of files) {
      const result = await validateAndProcessImage(file, {
        uploadDir: UPLOAD_DIR,
        urlPrefix: '/uploads/photos/',
        allowedMimeTypes: UPLOAD.ALLOWED_MIME_TYPES,
        maxSize: UPLOAD.MAX_FILE_SIZE,
        userId: _user.id,
      });
      photoUrls.push(result.url);
    }

    return NextResponse.json({ photos: photoUrls });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message.includes('Invalid file type') ||
        error.message.includes('File too large') ||
        error.message.includes('Empty file') ||
        error.message.includes('Invalid image file') ||
        error.message.includes('File content does not match') ||
        error.message.includes('Unable to read image')
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
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

    // Validate ownership: photo filename must start with user ID prefix
    // Format: /uploads/photos/{userId}-image-{uuid}.webp
    const urlPath = new URL(photoUrl, 'http://localhost').pathname;
    const filename = path.basename(urlPath);

    if (!filename.startsWith(`${user.id}-image-`) || !filename.endsWith('.webp')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prevent path traversal by using only the sanitized filename
    const filePath = path.join(UPLOAD_DIR, filename);

    // Verify file is within upload dir (defense in depth)
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(UPLOAD_DIR))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await cleanupFile(filePath);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('/api/profile/photos', 'Failed to delete photo', error);
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 });
  }
}
