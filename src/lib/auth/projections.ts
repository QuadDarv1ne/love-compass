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
