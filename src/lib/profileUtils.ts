import { Profile } from "@/types/portal";

/**
 * Gets the display name for a profile, prioritizing first_name + last_name,
 * then falling back to full_name, then email.
 * 
 * @param profile - The profile object (can be partial or null)
 * @param fallback - Optional fallback string if no name is available
 * @returns The display name string
 */
export function getDisplayName(
  profile: Partial<Profile> | null | undefined,
  fallback: string = 'Not assigned'
): string {
  if (!profile) return fallback;
  
  // Priority 1: first_name + last_name
  const firstName = profile.first_name?.trim();
  const lastName = profile.last_name?.trim();
  
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  
  if (firstName) {
    return firstName;
  }
  
  if (lastName) {
    return lastName;
  }
  
  // Priority 2: full_name
  if (profile.full_name?.trim()) {
    return profile.full_name.trim();
  }
  
  // Priority 3: email
  if (profile.email?.trim()) {
    return profile.email.trim();
  }
  
  return fallback;
}

/**
 * Gets the initials for a profile, using first_name/last_name or full_name
 */
export function getProfileInitials(
  profile: Partial<Profile> | null | undefined
): string {
  if (!profile) return '?';
  
  const firstName = profile.first_name?.trim();
  const lastName = profile.last_name?.trim();
  
  if (firstName && lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }
  
  if (firstName) {
    return firstName.charAt(0).toUpperCase();
  }
  
  if (lastName) {
    return lastName.charAt(0).toUpperCase();
  }
  
  if (profile.full_name?.trim()) {
    const parts = profile.full_name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    return parts[0].charAt(0).toUpperCase();
  }
  
  if (profile.email?.trim()) {
    return profile.email.charAt(0).toUpperCase();
  }
  
  return '?';
}
