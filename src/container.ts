import { parseEnv, type RawBindings } from '@/env';
import { createLogger } from '@/core/logger';
// import { makeApiKeyService } from '@/auth/api-key.service';
import { makeUserRepository } from '@/modules/user/user.repository';
import { makeUserService } from '@/modules/user/user.service';
// import { makePostRepository } from '@/modules/post/post.repository';
// import { makePostService } from '@/modules/post/post.service';
import { createDb } from '@/db/client';
import { createAuth } from '@/auth/better-auth';

export interface ContainerContext {
	requestId: string;
}
export function createContainer(raw: RawBindings, ctx: ContainerContext) {
	// 1. Validate configuration. Throws on bad config.
	const env = parseEnv(raw);
	// 2. Infrastructure
	const logger = createLogger({
		level: env.LOG_LEVEL,
		requestId: ctx.requestId,
		environment: env.ENVIRONMENT,
	});
	const db = createDb(env.DATABASE_URL);
	const auth = createAuth(env, db);
	// 3. Repositories — depend only on `db`
	const userRepo = makeUserRepository(db);
	// const postRepo = makePostRepository(db);
	// const apiKeyRepo = makeApiKeyRepository(db);
	// 4. Services — depend on repositories and each other
	// const apiKeyService = makeApiKeyService({
	// 	apiKeyRepo,
	// 	pepper: env.API_KEY_PEPPER,
	// });
	const userService = makeUserService({ userRepo });
	// const postService = makePostService({
	// 	postRepo,
	// 	userService, // ← service→service, never service→foreign repo
	// 	logger,
	// });
	return {
		env,
		logger,
		db,
		auth,
		// kv: {
		// 	rateLimit: raw.RATE_LIMIT_KV,
		// 	idempotency: raw.IDEMPOTENCY_KV,
		// },
		services: {
			user: userService,
			// post: postService,
			// apiKey: apiKeyService,
		},
	};
}
export type Container = ReturnType<typeof createContainer>;
