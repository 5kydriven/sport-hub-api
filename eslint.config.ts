import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import { defineConfig } from 'eslint/config';
import checkFile from 'eslint-plugin-check-file';

export default defineConfig(...tseslint.configs.recommended, {
	plugins: { import: importPlugin, 'check-file': checkFile },
	rules: {
		'import/no-restricted-paths': [
			'error',
			{
				zones: [
					{
						target: './src/core',
						from: './src/modules',
						message: 'core/ must not depend on modules/ (R3)',
					},
					{
						target: './src/modules/**/*.service.ts',
						from: './src/db',
						except: ['./src/db/schema'],
						message: 'Services must not touch the database directly (R2)',
					},
					{
						target: './src/modules/**/*.routes.ts',
						from: './src/modules/**/*.repository.ts',
						message: 'Routes must go through services, never repositories',
					},
				],
			},
		],
		'check-file/filename-naming-convention': [
			'error',
			{
				'src/modules/**/*.service.ts': '*.service',
				'src/**/*.ts': 'KEBAB_CASE',
			},
			{ ignoreMiddleExtensions: true },
		],
		'check-file/folder-naming-convention': [
			'error',
			{
				'src/modules/*': 'KEBAB_CASE',
			},
		],
	},
});
