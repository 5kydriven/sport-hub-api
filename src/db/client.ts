// db/client.ts
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

export function createDb(connectionString: string) {
	const sql = neon(connectionString);
	return drizzle(sql, {
		schema,
		logger: false, // enable per-env via container if desired
	});
}
export type Database = ReturnType<typeof createDb>;
