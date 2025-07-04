import homepage from "./index.html";
import { serve } from "bun";

const server = serve({
	routes: {
		"/": homepage,
	},

	// Enable development mode for:
	// - Detailed error messages
	// - Rebuild on request
	development: true,
	// Handle API requests
	async fetch(_req) {
		// Return 404 for unmatched routes
		//return new Response("Not Found", { status: 404 });
		return new Response("Hello world");
	},
});

console.log(`Listening on ${server.url}`);
