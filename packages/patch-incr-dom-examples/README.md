# incr-dom-examples

TodoMVC app based on patch-based incremental computation.

To install dependencies:

```bash
bun install
```

To run the server:

```bash
bun run server/server.ts
```

This project was created using `bun init` in bun v1.2.18. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.


Visit http://localhost:3000 for the TodoMVC app, and http://localhost:3000/ssr for the app with server-side rendering.

# Directory structure

- `server/`: The app itself
   - `todo_state.ts`: State and reducer for the TodoMVC app
   - `app.ts`: Rendering and event handlers for the TodoMVC app
   - `index.html`, `app.css`: The static HTML and CSS for the app
   - `server.ts`: Code for the HTTP server
- `test/`: Unit tests