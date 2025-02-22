import homepage from "./index.html";

const server = Bun.serve({
	static: {
		"/": homepage,
	},

	// Enable development mode for:
	// - Detailed error messages
	// - Rebuild on request
	development: true,
	// Handle API requests
	async fetch(req) {
		// Return 404 for unmatched routes
		return new Response("Not Found", { status: 404 });
	},
});

console.log(`Listening on ${server.url}`);
