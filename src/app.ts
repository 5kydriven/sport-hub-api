import { swaggerUI } from '@hono/swagger-ui';
import { createApp, registerOpenApi } from '@/core/http/openapi';
import { requestId } from '@/core/middleware/request-id';
import { accessLog } from '@/core/middleware/logger';
import { containerMiddleware } from '@/core/middleware/container';
import { errorHandler, notFoundHandler } from '@/core/middleware/error-handler';
import { authRouter } from '@/auth/routes';
import { corsMiddleware } from '@/core/middleware/cors';
import { securityHeaders } from '@/core/middleware/secure-headers';

const app = createApp();
// ── Global pipeline. ORDER IS LOAD-BEARING (see §9.1). ──
app.use('*', requestId);
app.onError(errorHandler);
app.notFound(notFoundHandler);
app.use('*', securityHeaders);
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
app.get('/docs', swaggerUI({ url: '/openapi.json' }));
export default app;

// Scheduled work reuses the SAME services. No HTTP involved. (P5)
// export const scheduled: ExportedHandler['scheduled'] = async (_e, env, ctx) => {
// 	const { createContainer } = await import('@/container');
// 	const container = createContainer(env as never, {
// 		requestId: crypto.randomUUID(),
// 	});
// 	ctx.waitUntil(container.services.user.purgeExpiredSoftDeletes());
// };
