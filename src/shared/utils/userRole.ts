import type { User } from "@/domain/entities/User";

/**
 * Checks if a user has admin or moderator privileges based on their badges.
 * The staff_badge is automatically assigned to users with admin or moderator roles.
 */
export function isStaffUser(user: User | undefined): boolean {
  if (!user) return false;
  return user.badges.includes("staff_badge");
}

/**
 * Checks if a user should display a verified badge (premium or staff).
 * This combines both premium membership and staff status for badge display purposes.
 */
export function shouldShowVerifiedBadge(user: User | undefined): boolean {
  if (!user) return false;
  return user.isPremium || isStaffUser(user);
}

/**
 * Checks if a participant should show verified badge based on badges array.
 * This is used for live room participants where we only have badges array.
 */
export function shouldShowVerifiedBadgeForParticipant(badges: string[] | undefined, isPremium: boolean | undefined): boolean {
  if (!badges) return isPremium ?? false;
  return (isPremium ?? false) || badges.includes("staff_badge");
}