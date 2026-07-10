import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password';
import { generateRandomToken, hashToken, getClientIp } from '@/lib/auth/crypto';
import { sendVerificationEmail } from '@/lib/email';
import { validateCSRFToken } from '@/lib/auth/csrf';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { logger } from '@/lib/logger';
import { REGISTRATION_LIMITS, VALIDATION, TOKEN } from '@/lib/constants';

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(VALIDATION.PASSWORD_MIN_LENGTH).max(VALIDATION.PASSWORD_MAX_LENGTH),
  name: z.string().min(1).max(VALIDATION.NAME_MAX_LENGTH),
  age: z.coerce.number().min(VALIDATION.AGE_MIN).max(VALIDATION.AGE_MAX),
  gender: z.enum(['male', 'female', 'other']),
  bio: z.string().max(VALIDATION.BIO_MAX_LENGTH).optional(),
  interests: z.string().max(VALIDATION.INTERESTS_MAX_LENGTH).optional(),
  avatar: z.string().url().optional().or(z.literal('')),
  city: z.string().max(VALIDATION.CITY_MAX_LENGTH).optional(),
  lookingFor: z.enum(['all', 'male', 'female']).optional(),
});

export async function POST(request: Request) {
  try {
    const csrfValid = await validateCSRFToken(request);
    if (!csrfValid) {
      return NextResponse.json(
        { error: 'CSRF validation failed' },
        { status: 403 }
      );
    }

    // Rate limiting: 5 registrations per IP per hour
    const ip = getClientIp(request);
    const rateLimit = await checkRateLimit(`register:${ip}`, REGISTRATION_LIMITS.MAX_PER_HOUR, REGISTRATION_LIMITS.WINDOW_SECONDS);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.issues },
        { status: 400 }
      );
    }

    const { password, ...userData } = result.data;

    // Password strength
    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      return NextResponse.json(
        { error: 'Password does not meet requirements', details: strength.errors },
        { status: 400 }
      );
    }

    // Check email uniqueness
    const existing = await db.user.findUnique({ email: userData.email.toLowerCase() });
    if (existing) {
      // Return generic response to prevent email enumeration, but with success status
      // so client shows the verification message instead of an error
      return NextResponse.json(
        {
          success: true,
          message: 'Check your email to verify your address',
        },
        { status: 200 }
      );
    }

    const passwordHash = await hashPassword(password);
    const emailVerificationToken = generateRandomToken(TOKEN.BYTE_LENGTH);
    const hashedEmailToken = hashToken(emailVerificationToken);
    const emailVerificationExpiry = new Date(Date.now() + TOKEN.VERIFICATION_EXPIRY_MS);

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
        message: 'Check your email to verify your address',
      },
      { status: 201 }
    );
  } catch (error) {
    // Handle unique constraint violation from TOCTOU race
    if (error instanceof Error) {
      const code = (error as { code?: unknown }).code;
      if (code === 'P2002' || code === '11000') {
        return NextResponse.json(
          {
            success: true,
            message: 'Check your email to verify your address',
          },
          { status: 200 }
        );
      }
    }
    logger.error('/api/auth/register', 'Registration error', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
