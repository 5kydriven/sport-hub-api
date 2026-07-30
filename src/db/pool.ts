import { ContainerContext } from '@/container';
import { parseEnv, RawBindings } from '@/env';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';

// db/pool.ts — ONLY if you need WebSocket/pooled connections
let _pool: Pool | undefined;
export function getPool(url: string): Pool {
	if (!_pool) _pool = new Pool({ connectionString: url });
	return _pool;
}
// container.ts
export function createContainer(raw: RawBindings, ctx: ContainerContext) {
	const env = parseEnv(raw);
	const db = drizzle(getPool(env.DATABASE_URL)); // pooled, cached
	// ...services still built fresh
}
