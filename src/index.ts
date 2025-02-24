export interface Env {
	SHORT_URLS: KVNamespace;
}

export default {
	async fetch(
		request: Request,
		env: Env,
		_ctx: ExecutionContext
	): Promise<Response> {
	const url = new URL(request.url);
	const { pathname } = url;
	const redirectURL = await env.SHORT_URLS.get(pathname);
	
	if (!redirectURL && pathname === "/") {
		return new Response('404', { status: 404 });
	}

	if (!redirectURL) {
		return Response.redirect(url.origin, 301);
	}
	return Response.redirect(redirectURL, 301);
	},
};
