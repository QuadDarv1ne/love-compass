import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password';
import { generateRandomToken, hashToken, getClientIp } from '@/lib/auth/crypto';
import { sendVerificationEmail } from '@/lib/email';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { logger } from '@/lib/logger';

const registerSchema = z.object({
  email: z.string().email('Неверный формат email'),
  password: z.string().min(1),
  name: z.string().min(1).max(100),
  age: z.coerce.number().min(18).max(120),
  gender: z.enum(['male', 'female', 'other']),
  bio: z.string().max(500).optional(),
  interests: z.string().max(500).optional(),
  avatar: z.string().url().optional().or(z.literal('')),
  city: z.string().max(100).optional(),
  lookingFor: z.enum(['all', 'male', 'female']).optional(),
});

export async function POST(request: Request) {
  try {
    // Rate limiting: 5 registrations per IP per hour
    const ip = getClientIp(request);
    const rateLimit = await checkRateLimit(`register:${ip}`, 5, 3600);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Слишком много попыток. Попробуйте позже' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Ошибка валидации', details: result.error.issues },
        { status: 400 }
      );
    }

    const { password, ...userData } = result.data;

    // Password strength
    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      return NextResponse.json(
        { error: 'Пароль не соответствует требованиям', details: strength.errors },
        { status: 400 }
      );
    }

    // Check email uniqueness
    const existing = await db.user.findUnique({ email: userData.email.toLowerCase() });
    if (existing) {
      // Return generic response to prevent email enumeration
      return NextResponse.json(
        {
          success: true,
          message: 'Проверьте вашу почту для подтверждения email',
        },
        { status: 201 }
      );
    }

    const passwordHash = await hashPassword(password);
    const emailVerificationToken = generateRandomToken(32);
    const hashedEmailToken = hashToken(emailVerificationToken);
    const emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const user = await db.user.create({
      ...userData,
      email: userData.email.toLowerCase(),
      passwordHash,
      emailVerificationToken: hashedEmailToken,
      emailVerificationExpiry,
      bio: userData.bio || '',
      interests: userData.interests || '',
      avatar: userData.avatar || '',
      city: userData.city || '',
      lookingFor: userData.lookingFor || 'all',
    });

    // Send verification email
    await sendVerificationEmail(user.email, emailVerificationToken);

    return NextResponse.json(
      {
        success: true,
        message: 'Проверьте вашу почту для подтверждения email',
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('/api/auth/register', 'Registration error', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
