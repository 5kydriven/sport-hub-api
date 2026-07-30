import { Hono } from 'hono';
import type { AppEnv } from '@/core/types';
export const authRouter = new Hono<AppEnv>();
// Better Auth owns /api/auth/sign-in, /sign-up, /sign-out, /session, ...

authRouter.on(['GET', 'POST'], '/*', (c) => {
	const { auth } = c.get('container');
	return auth.handler(c.req.raw);
});
