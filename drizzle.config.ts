// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	throw new Error('DATABASE_URL is not set. Add it to your .env file.');
}

export default defineConfig({
	dialect: 'postgresql',
	schema: './src/db/schema/**/*.ts',
	out: './drizzle',
	dbCredentials: {
		url: databaseUrl,
	},
});
