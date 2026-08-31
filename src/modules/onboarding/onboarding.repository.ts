import { and, eq, sql } from 'drizzle-orm';
import {
	gymOwnerProfiles,
	playerProfiles,
	users,
	venues,
} from '@/db/schema';
import type { Database } from '@/db/client';
import { notDeleted } from '@/db/predicates';
import type { CompleteOnboardingInput } from './onboarding.schema';

interface CompletionRow {
	[key: string]: unknown;
	completedAt: Date | string;
	venueId: string | null;
}

export function makeOnboardingRepository(db: Database) {
	return {
		async isComplete(userId: string): Promise<boolean> {
			const user = await db.query.users.findFirst({
				columns: { onboardingCompletedAt: true },
				where: and(eq(users.id, userId), notDeleted(users)),
			});
			return Boolean(user?.onboardingCompletedAt);
		},

		async complete(
			userId: string,
			input: CompleteOnboardingInput,
		): Promise<CompletionRow | null> {
			if (input.role === 'player') {
				const result = await db.execute<CompletionRow>(sql`
					WITH completed_user AS (
						UPDATE ${users}
						SET ${users.role} = 'player',
							${users.onboardingCompletedAt} = NOW(),
							${users.updatedAt} = NOW()
						WHERE ${users.id} = ${userId}
							AND ${users.deletedAt} IS NULL
							AND ${users.onboardingCompletedAt} IS NULL
						RETURNING ${users.id}, ${users.onboardingCompletedAt}
					), profile AS (
						INSERT INTO ${playerProfiles} (${playerProfiles.userId})
						SELECT ${sql.identifier('id')} FROM completed_user
					)
					SELECT ${sql.identifier('onboarding_completed_at')} AS "completedAt", NULL::uuid AS "venueId"
					FROM completed_user
				`);
				return result.rows[0] ?? null;
			}

			const result = await db.execute<CompletionRow>(sql`
				WITH completed_user AS (
					UPDATE ${users}
					SET ${users.role} = 'gym_owner',
						${users.onboardingCompletedAt} = NOW(),
						${users.updatedAt} = NOW()
					WHERE ${users.id} = ${userId}
						AND ${users.deletedAt} IS NULL
						AND ${users.onboardingCompletedAt} IS NULL
					RETURNING ${users.id}, ${users.onboardingCompletedAt}
				), profile AS (
					INSERT INTO ${gymOwnerProfiles} (${gymOwnerProfiles.userId})
					SELECT ${sql.identifier('id')} FROM completed_user
				), draft_venue AS (
					INSERT INTO ${venues} (
						${venues.ownerId}, ${venues.name}, ${venues.description},
						${venues.address}, ${venues.latitude}, ${venues.longitude},
						${venues.bookingAdvanceDays}
					)
					SELECT ${sql.identifier('id')}, ${input.venue.name}, ${input.venue.description},
						${input.venue.address}, ${String(input.venue.latitude)}, ${String(input.venue.longitude)},
						${input.venue.bookingAdvanceDays}
					FROM completed_user
					RETURNING ${venues.id}
				)
				SELECT completed_user.${sql.identifier('onboarding_completed_at')} AS "completedAt",
					draft_venue.${sql.identifier('id')} AS "venueId"
				FROM completed_user CROSS JOIN draft_venue
			`);
			return result.rows[0] ?? null;
		},
	};
}

export type OnboardingRepository = ReturnType<typeof makeOnboardingRepository>;
