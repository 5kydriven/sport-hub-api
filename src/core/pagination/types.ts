export interface PageMeta {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
}
export interface CursorMeta {
	limit: number;
	nextCursor: string | null;
	prevCursor: string | null;
	hasNextPage: boolean;
}
export interface Paginated<T> {
	data: T[];
	meta: PageMeta;
}
export interface CursorPaginated<T> {
	data: T[];
	meta: CursorMeta;
}
/** The decoded cursor. Must be a UNIQUE, ORDERED tuple. */
export interface Cursor {
	createdAt: Date;
	id: string;
}
export interface OffsetParams {
	page: number;
	limit: number;
}
export interface CursorParams {
	limit: number;
	cursor: Cursor | null;
}
