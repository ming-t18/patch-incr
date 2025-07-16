await Bun.build({
	entrypoints: ["./server/app.ts"],
	outdir: "./build",
	format: "esm",
	minify: {
		identifiers: true,
		syntax: true,
		whitespace: true,
	},
});
