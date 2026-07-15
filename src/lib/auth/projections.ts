/**
 * Shared projections for auth-related responses.
 * Kept here to avoid cross-route imports which Next.js doesn't support in production builds.
 */

/**
 * Prisma `select` object that fetches only non-sensitive user fields.
 * Prevents password hashes, TOTP secrets, etc. from being transferred over the DB wire.
 * This is the PRIMARY defense — only these fields leave the database.
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
 * Public-facing fields that are safe to expose to the client.
 * Uses an allowlist approach to prevent leaking newly-added sensitive fields.
 */
const PUBLIC_FIELDS: readonly string[] = [
  'id', 'email', 'name', 'age', 'gender', 'bio',
  'interests', 'avatar', 'photos', 'city', 'lookingFor',
  'emailVerified', 'role', 'notificationsEnabled',
  'profileVisible', 'showOnlineStatus', 'language',
  'showDistance', 'soundEnabled', 'matchNotifications',
  'likeNotifications', 'emailNotifications', 'lastSeenAt',
  'createdAt', 'updatedAt',
];

/**
 * Strip all sensitive fields from a user object before returning it to the client.
 * Uses an allowlist approach: only known public fields are preserved.
 * This prevents newly-added sensitive fields from leaking accidentally.
 */
export function sanitizeUser<T extends object>(user: T): T {
  const safe: Record<string, unknown> = {};
  const record = user as Record<string, unknown>;
  for (const field of PUBLIC_FIELDS) {
    if (field in record) {
      safe[field] = record[field];
    }
  }
  return safe as unknown as T;
}
