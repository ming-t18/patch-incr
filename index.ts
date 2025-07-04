await Bun.build({
  entrypoints: ['./server/app.ts'],
  outdir: './build',
});