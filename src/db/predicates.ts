// db/predicates.ts
import { isNull } from 'drizzle-orm';
import { PgColumn } from 'drizzle-orm/pg-core';
export const notDeleted = <T extends { deletedAt: PgColumn }>(t: T) =>
	isNull(t.deletedAt);
