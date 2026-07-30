export function buildLinkHeader(
	url: URL,
	meta: { nextCursor: string | null; prevCursor: string | null },
): string | null {
	const links: string[] = [];
	const withParam = (k: string, v: string) => {
		const u = new URL(url);
		u.searchParams.set(k, v);
		return u.toString();
	};
	if (meta.nextCursor)
		links.push(`<${withParam('cursor', meta.nextCursor)}>; rel="next"`);
	if (meta.prevCursor)
		links.push(`<${withParam('cursor', meta.prevCursor)}>; rel="prev"`);
	return links.length ? links.join(', ') : null;
}
