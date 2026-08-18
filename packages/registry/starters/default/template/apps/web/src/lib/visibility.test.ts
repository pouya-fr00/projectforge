import { describe, it, expect } from 'vitest';
import { isNavVisible } from './visibility';
import type { NavUser } from './visibility';
import type { WebNavItem } from '../features';

const comments: WebNavItem = { path: 'comments', title: 'Comments', description: '' };
const dashboard: WebNavItem = { path: 'dashboard', title: 'Dashboard', description: '' };
const adminNav: WebNavItem = { path: 'admin', title: 'Admin', description: '' };
const unknownNav: WebNavItem = { path: 'settings', title: 'Settings', description: '' };

const anonymous: NavUser | null = null;
const normal: NavUser = { role: 'user' };
const admin: NavUser = { role: 'admin' };

describe('isNavVisible', () => {
  describe('Comments', () => {
    it('is visible for anonymous', () => { expect(isNavVisible(comments, anonymous)).toBe(true); });
    it('is visible for normal user', () => { expect(isNavVisible(comments, normal)).toBe(true); });
    it('is visible for admin', () => { expect(isNavVisible(comments, admin)).toBe(true); });
  });

  describe('Dashboard', () => {
    it('is hidden for anonymous', () => { expect(isNavVisible(dashboard, anonymous)).toBe(false); });
    it('is visible for normal user', () => { expect(isNavVisible(dashboard, normal)).toBe(true); });
    it('is visible for admin', () => { expect(isNavVisible(dashboard, admin)).toBe(true); });
  });

  describe('Admin', () => {
    it('is hidden for anonymous', () => { expect(isNavVisible(adminNav, anonymous)).toBe(false); });
    it('is hidden for normal user', () => { expect(isNavVisible(adminNav, normal)).toBe(false); });
    it('is visible for admin', () => { expect(isNavVisible(adminNav, admin)).toBe(true); });
  });

  describe('unknown modules', () => {
    it('are hidden for anonymous', () => { expect(isNavVisible(unknownNav, anonymous)).toBe(false); });
    it('are visible for authenticated', () => { expect(isNavVisible(unknownNav, normal)).toBe(true); });
  });
});
