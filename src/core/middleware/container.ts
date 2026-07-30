// core/middleware/container.ts
import { createMiddleware } from 'hono/factory';
import { createContainer } from '@/container';
import type { AppEnv } from '@/core/types';
export const containerMiddleware = createMiddleware<AppEnv>(async (c, next) => {
	const container = createContainer(c.env, {
		requestId: c.get('requestId'),
	});
	c.set('container', container);
	c.set('logger', container.logger);
	await next();
});
