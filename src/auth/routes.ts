import { Hono } from 'hono';
import type { AppEnv } from '@/core/types';
export const authRouter = new Hono<AppEnv>();
// Better Auth owns the paths below the /v1/api/auth mount: sign-in, sign-up,
// sign-out, session, and credential recovery.

authRouter.on(['GET', 'POST'], '/*', (c) => {
	const { auth } = c.get('container');
	return auth.handler(c.req.raw);
});
