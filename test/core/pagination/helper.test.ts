import { describe, expect, test } from 'bun:test';
import { ValidationError } from '@/core/errors';
import {
	decodeCursor,
	encodeCursor,
	toCursorMeta,
} from '@/core/pagination/helper';

describe('pagination cursors', () => {
	test('round-trips a row identity without exposing implementation details', () => {
		const cursor = encodeCursor({
			createdAt: new Date('2026-08-30T12:00:00.000Z'),
			id: 'user-123',
		});

		expect(decodeCursor(cursor)).toEqual({
			createdAt: new Date('2026-08-30T12:00:00.000Z'),
			id: 'user-123',
		});
	});

	test('rejects malformed cursors as a validation error', () => {
		expect(() => decodeCursor('not-a-cursor')).toThrow(ValidationError);
	});

	test('only emits a next cursor when another page exists', () => {
		expect(
			toCursorMeta(
				[
					{
						createdAt: new Date('2026-08-30T12:00:00.000Z'),
						id: 'user-123',
					},
				],
				false,
			),
		).toEqual({
			limit: 1,
			nextCursor: null,
			prevCursor: encodeCursor({
				createdAt: new Date('2026-08-30T12:00:00.000Z'),
				id: 'user-123',
			}),
			hasNextPage: false,
		});
	});
});
