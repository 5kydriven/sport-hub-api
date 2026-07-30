// core/pagination/helpers.ts
import { ValidationError } from '@/core/errors';
import type { Cursor, CursorMeta } from './types';

/**
 * Cursors are base64url-encoded JSON. They are OPAQUE:
 * clients must treat them as strings and never parse them.
 * Encoding (not encryption) — do not put secrets in a cursor.
 */
export function encodeCursor(row: { createdAt: Date; id: string }): string {
	const json = JSON.stringify({ c: row.createdAt.toISOString(), i: row.id });
	return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeCursor(raw: string): Cursor {
	try {
		const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
		const parsed = JSON.parse(atob(b64)) as { c: string; i: string };
		const createdAt = new Date(parsed.c);
		if (Number.isNaN(createdAt.getTime())) throw new Error('bad date');
		if (typeof parsed.i !== 'string' || !parsed.i) throw new Error('bad id');
		return { createdAt, id: parsed.i };
	} catch {
		throw new ValidationError('Malformed cursor', { field: 'cursor' });
	}
}

export function toCursorMeta<T extends { createdAt: Date; id: string }>(
	rows: T[],
	hasNextPage: boolean,
): CursorMeta {
	// `.at()` narrows to `T | undefined`, which doubles as the emptiness check
	// the previous `rows.length > 0` guard was making separately.
	const first = rows.at(0);
	const last = rows.at(-1);

	return {
		limit: rows.length,
		nextCursor: hasNextPage && last ? encodeCursor(last) : null,
		prevCursor: first ? encodeCursor(first) : null,
		hasNextPage,
	};
}
