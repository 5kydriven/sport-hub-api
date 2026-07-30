import { OpenAPIHono } from '@hono/zod-openapi';
import { ZodError } from 'zod';

import type { AppEnv } from '@/core/types';

export function createApp() {
	return new OpenAPIHono<AppEnv>({
		// Route validation failures through OUR error envelope.
		defaultHook: (result) => {
			if (!result.success) {
				throw result.error as ZodError;
			}
		},
	});
}

export function registerOpenApi(app: OpenAPIHono<AppEnv>) {
	app.openAPIRegistry.registerComponent('securitySchemes', 'bearerAuth', {
		type: 'http',
		scheme: 'bearer',
		bearerFormat: 'opaque',
		description:
			'Session token from `POST /api/auth/sign-in`, or an API key (`sk_live_...`).',
	});

	app.doc31('/openapi.json', {
		openapi: '3.1.0',
		info: {
			title: 'API',
			version: '1.0.0',
			description: 'Reference implementation.',
		},
		servers: [
			{
				url: 'https://api.example.com',
				description: 'Production',
			},
		],
		security: [
			{
				bearerAuth: [],
			},
		], // Default; overridden per-route.
	});
}
