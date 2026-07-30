import { secureHeaders } from 'hono/secure-headers';

export const securityHeaders = secureHeaders({
	strictTransportSecurity: 'max-age=63072000; includeSubDomains; preload',
	xContentTypeOptions: 'nosniff',
	xFrameOptions: 'DENY',
	referrerPolicy: 'no-referrer',
	crossOriginResourcePolicy: 'same-site',
	// A JSON API serves no scripts. Lock it down entirely.
	contentSecurityPolicy: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
});
