import { OffsetParams, CursorParams } from '@/core/pagination/types';
import { Database } from '@/db/client';
import { UserRow, users } from '@/db/schema';
import { notDeleted } from '@/db/predicates';
import { count, desc, or, and, eq, lt, isNull } from 'drizzle-orm';

export function makeUserRepository(db: Database) {
	return {
		async findById(id: string) {
			return await db.query.users.findFirst({
				where: (users, { and, eq }) => and(eq(users.id, id), notDeleted(users)),
			});
		},

		async update(id: string, data: unknown) {
			// TODO
		},

		async delete(id: string) {
			const [deletedUser] = await db
				.delete(users)
				.where(eq(users.id, id))
				.returning();

			return deletedUser ?? null;
		},

		async softDelete(id: string) {
			const [user] = await db
				.update(users)
				.set({
					deletedAt: new Date(),
				})
				.where(eq(users.id, id))
				.returning();

			return user ?? null;
		},

		async restore(id: string) {
			const [user] = await db
				.update(users)
				.set({
					deletedAt: null,
				})
				.where(eq(users.id, id))
				.returning();

			return user ?? null;
		},

		async paginateOffset(
			p: OffsetParams,
		): Promise<{ rows: UserRow[]; total: number }> {
			// Both queries MUST share one predicate. If the count filters
			// differently from the page, `totalPages` disagrees with reality and
			// the last page renders empty.
			const where = notDeleted(users);
			const [rows, totalRows] = await Promise.all([
				db
					.select()
					.from(users)
					.where(where)
					.orderBy(desc(users.createdAt), desc(users.id))
					.limit(p.limit)
					.offset((p.page - 1) * p.limit),
				db.select({ value: count() }).from(users).where(where),
			]);

			// COUNT always yields exactly one row, but the type is indexed access,
			// so narrow rather than assert — a `!` here would crash on the one
			// shape TS is warning about.
			return { rows, total: totalRows[0]?.value ?? 0 };
		},

		async paginateCursor(p: CursorParams): Promise<UserRow[]> {
			const conditions = [isNull(users.deletedAt)];
			if (p.cursor) {
				// Keyset predicate. Row-value comparison — index-friendly.
				conditions.push(
					or(
						lt(users.createdAt, p.cursor.createdAt),
						and(
							eq(users.createdAt, p.cursor.createdAt),
							lt(users.id, p.cursor.id),
						),
					)!,
				);
			}
			return db
				.select()
				.from(users)
				.where(and(...conditions))
				.orderBy(desc(users.createdAt), desc(users.id))
				.limit(p.limit + 1); // +1 to detect hasNextPage
		},
	};
}

export type UserRepository = ReturnType<typeof makeUserRepository>;
