import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuthWithCSRF } from '@/lib/auth/guard';
import { logger } from '@/lib/logger';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import path from 'path';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatars');

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
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

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

    const avatarUrl = `/uploads/avatars/${filename}`;

    // Delete old avatar if it was a custom upload
    if (user.avatar && !user.avatar.startsWith('https://') && user.avatar !== '') {
      const oldPath = path.join(process.cwd(), 'public', user.avatar);
      if (existsSync(oldPath)) {
        try {
          unlinkSync(oldPath);
        } catch {
          // Ignore deletion errors
        }
      }
    }

    await db.user.update(
      { id: user.id },
      { avatar: avatarUrl }
    );

    return NextResponse.json({ avatar: avatarUrl });
  } catch (error) {
    logger.error('/api/profile/avatar', 'Failed to upload avatar', error);
    return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAuthWithCSRF(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;

    if (user.avatar && !user.avatar.startsWith('https://') && user.avatar !== '') {
      const filePath = path.join(process.cwd(), 'public', user.avatar);
      if (existsSync(filePath)) {
        try {
          unlinkSync(filePath);
        } catch {
          // Ignore deletion errors
        }
      }
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
