import { describe, expect, test } from 'bun:test';
import { USER_ROLES, isUserRole, venues } from '@/db/schema';

describe('user roles', () => {
	test('exposes the three supported account roles', () => {
		expect(USER_ROLES).toEqual(['admin', 'gym_owner', 'player']);
	});

	test('accepts only roles represented by the database enum', () => {
		expect(isUserRole('admin')).toBe(true);
		expect(isUserRole('gym_owner')).toBe(true);
		expect(isUserRole('player')).toBe(true);
		expect(isUserRole('owner')).toBe(false);
		expect(isUserRole(undefined)).toBe(false);
	});

	test('keeps venue publication disabled by default', () => {
		expect(venues.isPublished.default).toBe(false);
	});
});
