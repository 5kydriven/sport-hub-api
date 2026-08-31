import { describe, expect, test } from 'bun:test';
import app from '@/app';

const testEnv = {
	ENVIRONMENT: 'development',
	BETTER_AUTH_URL: 'http://localhost',
	LOG_LEVEL: 'info',
	CORS_ORIGINS: 'http://localhost:3000,http://127.0.0.1:3000',
	PAGE_SIZE_DEFAULT: '20',
	PAGE_SIZE_MAX: '100',
	DATABASE_URL: 'postgres://user:password@localhost/sport_api',
	BETTER_AUTH_SECRET: 'test-secret-that-is-at-least-32-characters',
};

describe('root route', () => {
	test('returns the plain-text server status', async () => {
		const response = await app.request('http://localhost/', {}, testEnv);

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toContain('text/plain');
		expect(await response.text()).toBe('Server is running!');
	});

	test('publishes version-first API paths in OpenAPI', async () => {
		const response = await app.request(
			'http://localhost/openapi.json',
			{},
			testEnv,
		);

		expect(response.status).toBe(200);
		const document = (await response.json()) as {
			paths: Record<
				string,
				{
					post?: {
						requestBody?: {
							content?: {
								'application/json'?: {
									schema?: { properties?: Record<string, unknown> };
								};
							};
						};
					};
				}
			>;
			components?: {
				schemas?: Record<
					string,
					{ properties?: Record<string, { enum?: string[] }> }
				>;
			};
		};
		expect(document.paths).toHaveProperty('/v1/api/auth/sign-up/email');
		expect(document.paths).toHaveProperty('/v1/api/me/onboarding');
		expect(document.paths).toHaveProperty('/v1/api/users');
		expect(document.paths).toHaveProperty('/v1/api/me/venues');
		expect(document.paths).toHaveProperty('/v1/api/venues');
		expect(document.paths).toHaveProperty('/v1/api/venues/{venueId}/courts');
		expect(document.paths).toHaveProperty('/v1/api/courts/{courtId}');
		expect(document.paths).not.toHaveProperty('/api/auth/sign-up/email');
		expect(document.paths).not.toHaveProperty('/v1/users');
		expect(document.paths).not.toHaveProperty('/v1/venues');
		expect(document.components?.schemas?.Court?.properties).toMatchObject({
			priceCentavos: {},
			currency: { enum: ['PHP'] },
			sport: {
				enum: ['basketball', 'badminton', 'volleyball', 'tennis', 'futsal'],
			},
		});
		expect(
			document.paths['/v1/api/auth/sign-up/email']?.post?.requestBody
				?.content?.['application/json']?.schema?.properties,
		).not.toHaveProperty('role');
	});

	test('serves sessions only from the version-first auth path', async () => {
		const [legacy, versionFirst] = await Promise.all([
			app.request('http://localhost/api/auth/get-session', {}, testEnv),
			app.request('http://localhost/v1/api/auth/get-session', {}, testEnv),
		]);

		expect(legacy.status).toBe(404);
		expect(versionFirst.status).toBe(200);
		expect(await versionFirst.json()).toBeNull();
	});
});
