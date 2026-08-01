import { CursorQuery } from '@/core/pagination/schema';
import { UserRepository } from './user.repository';
import {
	CursorPaginated,
	OffsetParams,
	Paginated,
} from '@/core/pagination/types';
import { decodeCursor, toCursorMeta } from '@/core/pagination/helper';
import { toPublicUser, User, UpdateUserInput } from './user.schema';
import { NotFoundError } from '@/core/errors';

export interface UserServiceDep {
	userRepo: UserRepository;
}

export function makeUserService(deps: UserServiceDep) {
	const { userRepo } = deps;

	return {
		async listCursor(q: CursorQuery): Promise<CursorPaginated<User>> {
			const rows = await userRepo.paginateCursor({
				limit: q.limit,
				cursor: q.cursor ? decodeCursor(q.cursor) : null,
			});
			// Repo fetched limit+1. Trim and report.
			const hasMore = rows.length > q.limit;
			const page = hasMore ? rows.slice(0, q.limit) : rows;
			return {
				data: page.map(toPublicUser),
				meta: toCursorMeta(page, hasMore),
			};
		},

		// Takes OffsetParams, not OffsetQuery: the service only ever needed
		// page+limit, and depending on the HTTP query type would have forced the
		// route to invent `sort`/`order` values it does not use.
		async listOffset(q: OffsetParams): Promise<Paginated<User>> {
			const { rows, total } = await userRepo.paginateOffset({
				page: q.page,
				limit: q.limit,
			});
			return {
				data: rows.map(toPublicUser),
				meta: {
					page: q.page,
					limit: q.limit,
					total,
					totalPages: Math.ceil(total / q.limit),
					hasNextPage: q.page * q.limit < total,
					hasPrevPage: q.page > 1,
				},
			};
		},

		// `null` from the repository is a fact; deciding it means "not found" is
		// policy, and policy lives one layer up. Note the domain error, not a
		// transport-layer one — a cron trigger consuming this has no use for a
		// status code (P5/§7). The edge translates it to 404.
		async updateUser(id: string, data: UpdateUserInput): Promise<User> {
			const updated = await userRepo.update(id, data);
			if (!updated) throw new NotFoundError('User', id);
			return toPublicUser(updated);
		},

		// Soft delete, deliberately: `deletedAt` is what every read path filters
		// on via `notDeleted`, and a hard delete would strip the row out from
		// under the auth tables that reference it.
		async deleteUser(id: string): Promise<void> {
			const deleted = await userRepo.softDelete(id);
			if (!deleted) throw new NotFoundError('User', id);
		},
	};
}

export type UserService = ReturnType<typeof makeUserService>;
