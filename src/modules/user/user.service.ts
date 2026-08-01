import { CursorQuery } from '@/core/pagination/schema';
import { UserRepository } from './user.repository';
import {
	CursorPaginated,
	OffsetParams,
	Paginated,
} from '@/core/pagination/types';
import { decodeCursor, toCursorMeta } from '@/core/pagination/helper';
import { toPublicUser, User } from './user.schema';

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

		async updateUser(data: unknown) {},
		async deleteUser(id: string) {},
	};
}

export type UserService = ReturnType<typeof makeUserService>;
