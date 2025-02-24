export interface Env {
    SHORT_URLS: KVNamespace;
}

function isValidUrl(urlString: string): boolean {
    try {
        const url = new URL(urlString);
        // Optionally, add more validation logic here, e.g., check if the URL belongs to a trusted domain
        return url.protocol === "http:" || url.protocol === "https:";
    } catch (e) {
        return false;
    }
}

async function listShortlinks(env: Env): Promise<string[]> {
    const list = await env.SHORT_URLS.list();
    return list.keys.map(key => key.name);
}

export default {
    async fetch(
        request: Request,
        env: Env,
        _ctx: ExecutionContext
    ): Promise<Response> {
        const url = new URL(request.url);
        const { pathname } = url;

        if (pathname === "/shorten" && request.method === "GET") {
            const shortlinks = await listShortlinks(env);
            const shortlinksHtml = shortlinks.map(shortlink => `
                <li>
                    ${shortlink} 
                    <form action="/delete" method="POST" style="display:inline;">
                        <input type="hidden" name="shortlink" value="${shortlink}">
                        <button type="submit">Delete</button>
                    </form>
                </li>
            `).join('');

            return new Response(
                `<html>
                    <body>
                        <form action="/shorten" method="POST">
                            <label for="ogurl">url:</label>
                            <input type="text" id="ogurl" name="ogurl" required>
                            <br>
                            <label for="path">path:</label>
                            <input type="text" id="path" name="path" required>
                            <br>
                            <button type="submit">Create</button>
                        </form>
                        <ul>
                            ${shortlinksHtml}
                        </ul>
                    </body>
                </html>`,
                { headers: { "Content-Type": "text/html" } }
            );
        }

        if (pathname === "/shorten" && request.method === "POST") {
            const formData = await request.formData();
            const originalUrl = formData.get("ogurl") as string;
            const shortlink = formData.get("path") as string;

            if (!originalUrl || !shortlink || !isValidUrl(originalUrl)) {
                return new Response("Invalid input", { status: 400 });
            }

            await env.SHORT_URLS.put(shortlink.charAt(0) === '/' ? shortlink : `/${shortlink}`, originalUrl);
            return new Response("Shortlink created successfully!", { status: 201 });
        }

        if (pathname === "/delete" && request.method === "POST") {
            const formData = await request.formData();
            const shortlink = formData.get("shortlink") as string;

            if (!shortlink) {
                return new Response("Invalid input", { status: 400 });
            }

            await env.SHORT_URLS.delete(shortlink);
            return new Response("Shortlink deleted successfully!", { status: 200 });
        }

        const redirectURL = await env.SHORT_URLS.get(pathname);
        if (!redirectURL) {
            return new Response("404 Not Found", { status: 404 });
        }
        return Response.redirect(redirectURL, 301);
    },
};