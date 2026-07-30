import { Scalar } from '@scalar/hono-api-reference';
import { except } from 'hono/combine';
import { createApp, registerOpenApi } from '@/core/http/openapi';
import { requestId } from '@/core/middleware/request-id';
import { accessLog } from '@/core/middleware/logger';
import { containerMiddleware } from '@/core/middleware/container';
import { errorHandler, notFoundHandler } from '@/core/middleware/error-handler';
import { authRouter } from '@/auth/routes';
import { corsMiddleware } from '@/core/middleware/cors';
import {
	securityHeaders,
	docsSecurityHeaders,
} from '@/core/middleware/secure-headers';

const app = createApp();
// ── Global pipeline. ORDER IS LOAD-BEARING (see §9.1). ──
app.use('*', requestId);
app.onError(errorHandler);
app.notFound(notFoundHandler);
// `/docs` is excluded because the global policy forbids scripts outright, and
// this middleware writes its headers on the way back out — so if it ran here it
// would overwrite the docs-specific policy set further down the chain.
app.use('*', except('/docs', securityHeaders));
app.use('*', corsMiddleware());
app.use('*', containerMiddleware);
app.use('*', accessLog);
// ── Unauthenticated ──
app.get('/health', (c) => c.json({ ok: true, ts: Date.now() }));
app.route('/api/auth', authRouter);

// ── Versioned API. Auth is applied per-route, not globally,
// so individual routes can opt out cleanly. ──
// app.route('/v1', userRoutes);

// ── Documentation ──
registerOpenApi(app);
app.get(
	'/docs',
	docsSecurityHeaders,
	Scalar((c) => ({
		url: '/openapi.json',
		pageTitle: 'Sport API',
		// Stamps every tag the renderer emits, satisfying the docs CSP without
		// resorting to script-src 'unsafe-inline'.
		nonce: c.get('secureHeadersNonce'),
	})),
);
export default app;

// Scheduled work reuses the SAME services. No HTTP involved. (P5)
// export const scheduled: ExportedHandler['scheduled'] = async (_e, env, ctx) => {
// 	const { createContainer } = await import('@/container');
// 	const container = createContainer(env as never, {
// 		requestId: crypto.randomUUID(),
// 	});
// 	ctx.waitUntil(container.services.user.purgeExpiredSoftDeletes());
// };
