import type { WebNavItem } from '../features';

export interface NavUser {
  role?: string;
}

/**
 * Shared visibility policy for navigation items and Home cards.
 *
 * Server-side RBAC remains authoritative — this is UX filtering only.
 */
export function isNavVisible(item: WebNavItem, user: NavUser | null): boolean {
  // Comments is always public.
  if (item.path === 'comments') return true;
  // Dashboard requires authentication (any role).
  if (item.path === 'dashboard') return user !== null;
  // Admin requires the admin role.
  if (item.path === 'admin') return user?.role === 'admin';
  // Unknown optional modules: authenticated-only by default for safety.
  return user !== null;
}
