import type { DbUser } from '@/lib/db/types';
import { SCORING } from '@/lib/constants';

function parseInterests(interests: string): string[] {
  return interests
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  const intersection = a.filter((x) => setB.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return intersection / union;
}

function ageCompatibility(ageA: number, ageB: number): number {
  const diff = Math.abs(ageA - ageB);
  if (diff <= 3) return 1;
  if (diff <= 5) return 0.8;
  if (diff <= 10) return 0.5;
  if (diff <= 15) return 0.3;
  return 0.1;
}

function lookingForMatch(lookingFor: string, targetGender: string): number {
  if (lookingFor === 'all') return 0.5;
  if (lookingFor === targetGender) return 1;
  return 0;
}

export function computeCompatibilityScore(
  currentUser: Pick<DbUser, 'age' | 'interests' | 'lookingFor'>,
  targetUser: Pick<DbUser, 'age' | 'interests' | 'gender'>,
): number {
  const currentInterests = parseInterests(currentUser.interests);
  const targetInterests = parseInterests(targetUser.interests);

  const interestScore = jaccardSimilarity(currentInterests, targetInterests);
  const ageScore = ageCompatibility(currentUser.age, targetUser.age);
  const lookingScore = lookingForMatch(currentUser.lookingFor, targetUser.gender);

  return (
    interestScore * SCORING.INTEREST_WEIGHT +
    ageScore * SCORING.AGE_WEIGHT +
    lookingScore * SCORING.LOOKING_WEIGHT +
    SCORING.BASE_RECOMMENDATION
  );
}
