/**
 * Shared projections for auth-related responses.
 * Kept here to avoid cross-route imports which Next.js doesn't support in production builds.
 */
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
 * Prisma `select` object that fetches only non-sensitive user fields.
 * Prevents password hashes, TOTP secrets, etc. from being transferred over the DB wire.
 */
export const PUBLIC_USER_SELECT = {
  id: true, email: true, name: true, age: true, gender: true, bio: true,
  interests: true, avatar: true, photos: true, city: true, lookingFor: true,
  emailVerified: true, role: true, notificationsEnabled: true,
  profileVisible: true, showOnlineStatus: true, language: true,
  showDistance: true, soundEnabled: true, matchNotifications: true,
  likeNotifications: true, emailNotifications: true, lastSeenAt: true,
  createdAt: true, updatedAt: true,
} as const;

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
