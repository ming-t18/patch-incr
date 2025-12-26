import { serve } from "bun";
import { renderToString } from "patch-incr-dom/render";
import benchPage from "./../framework_benchmark/index.html";
import jsonEditorPage from "./../json_editor/index.html";
import { initState, renderTodoApp } from "../todo_app/app";
import todoPage from "./../todo_app/index.html";

const server = serve({
	routes: {
		"/todo": todoPage,
		"/bench": benchPage,
		"/json-editor": jsonEditorPage,
		"/ssr": async (_req): Promise<Response> => {
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
			const resp = await Bun.fetch(
				`${server.url || "http://localhost:3000"}/todo`,
			);
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
