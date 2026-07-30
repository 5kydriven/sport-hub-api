// core/middleware/request-id.ts
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '@/core/types';

const HEADER = 'x-request-id';

export const requestId = createMiddleware<AppEnv>(async (c, next) => {
	// Honor upstream trace IDs (load balancer, gateway, CF ray).
	const incoming = c.req.header(HEADER) ?? c.req.header('cf-ray');
	const id = incoming ?? crypto.randomUUID();
	c.set('requestId', id);
	c.header(HEADER, id);
	await next();
});
