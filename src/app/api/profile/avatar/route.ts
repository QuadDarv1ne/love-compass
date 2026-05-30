import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuthWithCSRF } from '@/lib/auth/guard';
import { logger } from '@/lib/logger';
import path from 'path';
import { UPLOAD } from '@/lib/constants';
import { validateAndProcessImage, cleanupFile } from '@/lib/upload';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatars');
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(request: Request) {
  try {
    const auth = await requireAuthWithCSRF(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;
    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const result = await validateAndProcessImage(file, {
      uploadDir: UPLOAD_DIR,
      urlPrefix: '/uploads/avatars/',
      allowedMimeTypes: ALLOWED_TYPES,
      maxSize: UPLOAD.MAX_FILE_SIZE,
    });

    const avatarUrl = result.url;

    // Delete old avatar if it was a custom upload
    if (user.avatar && user.avatar.startsWith('/uploads/avatars/')) {
      const oldFilename = path.basename(user.avatar);
      const oldPath = path.join(UPLOAD_DIR, oldFilename);
      await cleanupFile(oldPath);
    }

    await db.user.update(
      { id: user.id },
      { avatar: avatarUrl }
    );

    return NextResponse.json({ avatar: avatarUrl });
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
    logger.error('/api/profile/avatar', 'Failed to upload avatar', error);
    return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAuthWithCSRF(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;

    if (user.avatar && user.avatar.startsWith('/uploads/avatars/')) {
      const filename = path.basename(user.avatar);
      // Verify ownership: filename must start with user ID prefix (format: {userId}-{uuid}.{ext})
      if (!filename.startsWith(`${user.id}-`)) {
        logger.warn('/api/profile/avatar', 'Avatar deletion rejected: ownership mismatch', { userId: user.id, filename });
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const filePath = path.join(UPLOAD_DIR, filename);
      await cleanupFile(filePath);
    }

    await db.user.update(
      { id: user.id },
      { avatar: '' }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('/api/profile/avatar', 'Failed to delete avatar', error);
    return NextResponse.json({ error: 'Failed to delete avatar' }, { status: 500 });
  }
}
