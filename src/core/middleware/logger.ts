import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '@/core/types';
export const accessLog = createMiddleware<AppEnv>(async (c, next) => {
	const start = Date.now();
	await next();
	const logger = c.get('logger');
	const durationMs = Date.now() - start;
	const status = c.res.status;
	const line = {
		method: c.req.method,
		path: c.req.path,
		status,
		durationMs,
		principalId: c.get('principal')?.id ?? null,
	};
	if (status >= 500) logger.error('http.request', line);
	else if (status >= 400) logger.warn('http.request', line);
	else logger.info('http.request', line);
});
