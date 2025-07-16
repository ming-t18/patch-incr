import { type Server, serve } from "bun";
import { renderToString } from "incr-dom/render";
import { initState, renderTodoApp } from "./app";
import homepage from "./index.html";

const server: Server = serve({
	routes: {
		"/": homepage,
		"/ssr": async (_req) => {
			const rewriter = new HTMLRewriter();
			rewriter.on("#root", {
				element(el) {
					const domc = renderTodoApp.evaluate({
						state: initState,
						dispatch: () => {
							throw new Error("dispatch");
						},
					});
					el.setInnerContent(renderToString(domc), { html: true });
					el.setAttribute("data-ssr", "true");
				},
			});
			const resp = await Bun.fetch(server.url || "http://localhost:3000/");
			return rewriter.transform(resp);
		},
	},

	// Enable development mode for:
	// - Detailed error messages
	// - Rebuild on request
	development: true,
	// Handle API requests
	async fetch(_req) {
		// Return 404 for unmatched routes
		return new Response("Not Found", { status: 404 });
	},
});

console.log(`Listening on ${server.url}`);
