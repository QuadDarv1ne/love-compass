/**
 * Shared projections for auth-related responses.
 * Kept here to avoid cross-route imports which Next.js doesn't support in production builds.
 */
export const loginUserSelect = {
  id: true,
  email: true,
  name: true,
  age: true,
  gender: true,
  bio: true,
  interests: true,
  avatar: true,
  photos: true,
  city: true,
  lookingFor: true,
  emailVerified: true,
  totpEnabled: true,
  profileVisible: true,
  showOnlineStatus: true,
  language: true,
  createdAt: true,
  updatedAt: true,
};

const SENSITIVE_FIELDS: readonly string[] = [
  'passwordHash',
  'totpSecret',
  'totpBackupCodes',
  'passwordResetToken',
  'passwordResetExpiry',
  'emailVerificationToken',
  'emailVerificationExpiry',
  'loginAttempts',
  'lockedUntil',
];

/**
 * Strip all sensitive fields from a user object before returning it to the client.
 * Prevents password hash, TOTP secrets, and reset tokens from leaking via API responses.
 */
export function sanitizeUser<T>(user: T): T {
  const safe = { ...user } as Record<string, unknown>;
  for (const field of SENSITIVE_FIELDS) {
    delete safe[field as string];
  }
  return safe as T;
}
