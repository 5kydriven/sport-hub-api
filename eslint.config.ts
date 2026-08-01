import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import { defineConfig } from 'eslint/config';
import checkFile from 'eslint-plugin-check-file';

export default defineConfig(...tseslint.configs.recommended, {
	plugins: { import: importPlugin, 'check-file': checkFile },
	// Load-bearing for every `import/no-restricted-paths` zone below.
	// `no-restricted-paths` can only test an import it can RESOLVE to a file on
	// disk; the default Node resolver does not know about `.ts` extensions or
	// the `@/*` path alias, so every zone silently passed — a route could import
	// a repository and lint stayed green. A rule that cannot resolve is not a
	// rule that fails; it is a rule that is not there.
	settings: {
		'import/resolver': {
			typescript: { project: './tsconfig.json' },
		},
	},
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
		// S1/S1b — module-level mutable state is the exact shape the legibility
		// standard bans: a binding later code reaches back into, with no
		// declaration site the reader can see from where it is used.
		'no-restricted-syntax': [
			'error',
			{
				selector: "Program > VariableDeclaration[kind='let']",
				message:
					'No module-level `let` — module-scope mutable state violates S1/P1.',
			},
			{
				selector:
					"Program > ExportNamedDeclaration > VariableDeclaration[kind='let']",
				message:
					'No module-level `let` — module-scope mutable state violates S1/P1.',
			},
		],
		// Dead code rots quietly. §13.
		'@typescript-eslint/no-unused-vars': 'error',
		// S4. `ignoreMiddleExtensions` strips `.service`/`.routes`/etc. before
		// matching, so `user.service.ts` is checked as `user` — which is what
		// makes KEBAB_CASE the right test for every module file. A separate
		// `'src/modules/**/*.service.ts': '*.service'` entry used to sit here and
		// could never pass: the glob had already stripped the very extension the
		// pattern was asking for. The glob key is the enforcement — a file only
		// reaches it by already being named `*.service.ts`.
		'check-file/filename-naming-convention': [
			'error',
			{
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
},
{
	// P5 and the layer contract, mechanised. This replaces the §13 grep for
	// `Context|c.req|c.json|HTTPException`: it matches the *import* rather than
	// the word, so it cannot be tripped by a comment that merely discusses HTTP,
	// and it cannot be evaded by aliasing the import to another name.
	//
	// `allowTypeImports` is deliberately left off. `import type { Context }` is
	// exactly as much of a violation as a value import — the point is that a
	// service must be callable from a cron trigger or a test, and HTTP must not
	// appear in its signature at all.
	files: ['src/modules/**/*.service.ts'],
	rules: {
		'@typescript-eslint/no-restricted-imports': [
			'error',
			{
				patterns: [
					{
						group: ['hono', 'hono/*'],
						message:
							'Services must run without HTTP (P5). No Context, no HTTPException — throw a domain error from @/core/errors and let error-handler.ts translate it at the edge (§7).',
					},
				],
			},
		],
	},
});
