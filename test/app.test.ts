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
});
