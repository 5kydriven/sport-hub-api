import { secureHeaders, NONCE } from 'hono/secure-headers';

/** CDN serving the API-reference bundle. Referenced by the docs CSP only. */
export const DOCS_CDN = 'https://cdn.jsdelivr.net';

const BASE = {
	strictTransportSecurity: 'max-age=63072000; includeSubDomains; preload',
	xContentTypeOptions: 'nosniff',
	xFrameOptions: 'DENY',
	referrerPolicy: 'no-referrer',
	crossOriginResourcePolicy: 'same-site',
} as const;

export const securityHeaders = secureHeaders({
	...BASE,
	// A JSON API serves no scripts. Lock it down entirely.
	contentSecurityPolicy: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
});

/**
 * The docs page is the one route that legitimately executes scripts, so it
 * needs its own policy — the API's `default-src 'none'` renders it blank.
 *
 * Scripts stay locked to a per-request nonce plus the CDN origin; `NONCE`
 * makes Hono mint the value and expose it on `c.get('secureHeadersNonce')`,
 * which the renderer stamps onto every tag it emits. `connect-src 'self'` is
 * load-bearing: the page fetches /openapi.json at runtime.
 */
export const docsSecurityHeaders = secureHeaders({
	...BASE,
	contentSecurityPolicy: {
		defaultSrc: ["'none'"],
		scriptSrc: [NONCE, DOCS_CDN],
		// Styles are nonced where we emit them, but the bundle also injects
		// stylesheets at runtime; 'unsafe-inline' keeps the page readable
		// without loosening script execution, which is the risk that matters.
		styleSrc: ["'unsafe-inline'", DOCS_CDN],
		imgSrc: ["'self'", 'data:', DOCS_CDN],
		fontSrc: ["'self'", 'data:', DOCS_CDN],
		connectSrc: ["'self'"],
		frameAncestors: ["'none'"],
		baseUri: ["'self'"],
	},
});
